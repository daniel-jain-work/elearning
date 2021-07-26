import { coolDownInterval, defaultTimezone, tzOpts } from 'cl-common';
import { ClassModel, CourseModel, ZoomhostModel } from 'cl-models';
import * as config from 'config';
import { calendar_v3, google } from 'googleapis';
import { isEmpty } from 'lodash';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { getOpsClassUrl, siteUrl } from './url-utils';

const clientEmail = config.get('google.cert.client_email') as string;
const apiKey = config.get('google.cert.private_key') as string;
const opts = config.get('google.calendar') as {
  account: string;
  id: string;
  useResource: boolean;
};

const calendarAPI = google.calendar({
  version: 'v3',
  auth: new google.auth.JWT(
    clientEmail,
    undefined,
    apiKey,
    ['https://www.googleapis.com/auth/calendar'],
    opts.account
  )
});

export async function createEvent(
  klass: ClassModel,
  course: CourseModel,
  logger: Logger
) {
  const event = await buildEvent(klass, course);
  const { data } = await calendarAPI.events.insert({
    calendarId: opts.id,
    requestBody: event
  });

  await klass.update({ details: { ...klass.details, eventId: data.id } });
  logger.info({ eventId: data.id }, 'calendar event created');

  return data;
}

export async function updateEvent(
  klass: ClassModel,
  course: CourseModel,
  logger: Logger
) {
  if (!klass.eventId) {
    return;
  }

  const event = await buildEvent(klass, course);
  await calendarAPI.events.update({
    calendarId: opts.id,
    eventId: klass.eventId,
    requestBody: event
  });

  logger.info({ eventId: klass.eventId }, 'calendar event updated');
}

export const upsertEvent = (
  klass: ClassModel,
  course: CourseModel,
  logger: Logger
) =>
  klass.eventId
    ? updateEvent(klass, course, logger)
    : createEvent(klass, course, logger);

export async function deleteEvent(klass: ClassModel, logger: Logger) {
  if (!klass.eventId) {
    return;
  }

  await calendarAPI.events.delete({ calendarId: opts.id, eventId: klass.eventId });
  logger.info({ eventId: klass.eventId }, 'calendar event deleted');
}

export async function getAvailableResources(klass: ClassModel) {
  let hosts = await ZoomhostModel.findAll();

  for (const session of klass.sessions) {
    if (session.endDate.getTime() < Date.now()) {
      // skip for past class
      continue;
    }

    const { data } = await calendarAPI.freebusy.query({
      requestBody: {
        calendarExpansionMax: 50,
        items: hosts.map(host => ({ id: host.resource })),
        timeMin: session.startDate.toJSON(),
        timeMax: DateTime.fromJSDate(session.endDate)
          .plus({ minutes: coolDownInterval })
          .toJSON()
      }
    });

    hosts = hosts.filter(
      host =>
        isEmpty(data.calendars[host.resource].busy) &&
        isEmpty(data.calendars[host.resource].errors)
    );

    if (hosts.length === 0) {
      break;
    }
  }

  return hosts;
}

async function buildEvent(klass: ClassModel, course: CourseModel) {
  const { sessions } = klass;
  const dStart = DateTime.fromJSDate(klass.startDate, tzOpts);
  const dEnd = DateTime.fromJSDate(klass.endDate, tzOpts);
  const teacher = klass.teacher || (await klass.getTeacher());
  const observers = klass.observers || (await klass.getObservers());

  const info = [
    `Scheduled at ${dStart.toFormat('ff')} - ${dEnd.toFormat('ff')}`,
    `*** For Ops: Manage class at ${getOpsClassUrl(klass)}`,
    `*** For Teacher: Latest information is always available on ${siteUrl.teaching}. For any questions or reschedule request, please reach out to teacher-support@createandlearn.us.`
  ];

  const event: calendar_v3.Schema$Event = {
    summary: course.name,
    description: info.join('\n\n'),
    guestsCanModify: false,
    location: klass.dialInLink,
    start: {
      dateTime: DateTime.fromJSDate(sessions[0].startDate).toUTC().toISO(),
      timeZone: defaultTimezone
    },
    end: {
      dateTime: DateTime.fromJSDate(sessions[0].endDate)
        .plus({ minutes: coolDownInterval })
        .toUTC()
        .toISO(),
      timeZone: defaultTimezone
    },
    reminders: {
      useDefault: true
    }
  };

  if (sessions.length > 1) {
    const rdates = sessions.map(s =>
      DateTime.fromJSDate(s.startDate, tzOpts).toFormat("yyyyLLdd'T'HHmmss")
    );
    event.recurrence = [`RDATE;TZID=${defaultTimezone}:${rdates.join(',')}`];
  }

  const attendees: calendar_v3.Schema$EventAttendee[] = [];

  if (opts.useResource && klass.zoomhostId) {
    const host = klass.zoomhost || (await klass.getZoomhost());
    attendees.push({
      email: host.resource,
      resource: true
    });
  }

  if (teacher) {
    attendees.push({
      displayName: teacher.fullName,
      email: teacher.email
    });
  }

  if (observers.length > 0) {
    for (const observer of observers) {
      attendees.push({
        displayName: observer.fullName,
        email: observer.email
      });
    }
  }

  if (attendees.length > 0) {
    event.attendees = attendees;
  }

  return event;
}
