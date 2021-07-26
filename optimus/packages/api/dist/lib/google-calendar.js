"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableResources = exports.deleteEvent = exports.upsertEvent = exports.updateEvent = exports.createEvent = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const config = require("config");
const googleapis_1 = require("googleapis");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const clientEmail = config.get('google.cert.client_email');
const apiKey = config.get('google.cert.private_key');
const opts = config.get('google.calendar');
const calendarAPI = googleapis_1.google.calendar({
    version: 'v3',
    auth: new googleapis_1.google.auth.JWT(clientEmail, undefined, apiKey, ['https://www.googleapis.com/auth/calendar'], opts.account)
});
async function createEvent(klass, course, logger) {
    const event = await buildEvent(klass, course);
    const { data } = await calendarAPI.events.insert({
        calendarId: opts.id,
        requestBody: event
    });
    await klass.update({ details: { ...klass.details, eventId: data.id } });
    logger.info({ eventId: data.id }, 'calendar event created');
    return data;
}
exports.createEvent = createEvent;
async function updateEvent(klass, course, logger) {
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
exports.updateEvent = updateEvent;
exports.upsertEvent = (klass, course, logger) => klass.eventId
    ? updateEvent(klass, course, logger)
    : createEvent(klass, course, logger);
async function deleteEvent(klass, logger) {
    if (!klass.eventId) {
        return;
    }
    await calendarAPI.events.delete({ calendarId: opts.id, eventId: klass.eventId });
    logger.info({ eventId: klass.eventId }, 'calendar event deleted');
}
exports.deleteEvent = deleteEvent;
async function getAvailableResources(klass) {
    let hosts = await cl_models_1.ZoomhostModel.findAll();
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
                timeMax: luxon_1.DateTime.fromJSDate(session.endDate)
                    .plus({ minutes: cl_common_1.coolDownInterval })
                    .toJSON()
            }
        });
        hosts = hosts.filter(host => lodash_1.isEmpty(data.calendars[host.resource].busy) &&
            lodash_1.isEmpty(data.calendars[host.resource].errors));
        if (hosts.length === 0) {
            break;
        }
    }
    return hosts;
}
exports.getAvailableResources = getAvailableResources;
async function buildEvent(klass, course) {
    const { sessions } = klass;
    const dStart = luxon_1.DateTime.fromJSDate(klass.startDate, cl_common_1.tzOpts);
    const dEnd = luxon_1.DateTime.fromJSDate(klass.endDate, cl_common_1.tzOpts);
    const teacher = klass.teacher || (await klass.getTeacher());
    const info = [
        `Scheduled at ${dStart.toFormat('ff')} - ${dEnd.toFormat('ff')}`,
        `*** For Ops: Manage class at ${cl_common_1.getOpsClassUrl(klass)}`,
        `*** For Teacher: Latest information is always available on ${cl_common_1.teacherSiteUrl}. For any questions or reschedule request, please reach out to teacher-support@createandlearn.us.`
    ];
    const event = {
        summary: course.name,
        description: info.join('\n\n'),
        guestsCanModify: false,
        location: klass.dialInLink,
        start: {
            dateTime: luxon_1.DateTime.fromJSDate(sessions[0].startDate).toUTC().toISO(),
            timeZone: cl_common_1.defaultTimezone
        },
        end: {
            dateTime: luxon_1.DateTime.fromJSDate(sessions[0].endDate)
                .plus({ minutes: cl_common_1.coolDownInterval })
                .toUTC()
                .toISO(),
            timeZone: cl_common_1.defaultTimezone
        },
        reminders: {
            useDefault: true
        }
    };
    if (sessions.length > 1) {
        const rdates = sessions.map(s => luxon_1.DateTime.fromJSDate(s.startDate, cl_common_1.tzOpts).toFormat("yyyyLLdd'T'HHmmss"));
        event.recurrence = [`RDATE;TZID=${cl_common_1.defaultTimezone}:${rdates.join(',')}`];
    }
    const attendees = [];
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
    if (attendees.length > 0) {
        event.attendees = attendees;
    }
    return event;
}
