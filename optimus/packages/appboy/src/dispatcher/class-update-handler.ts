import { Graphql, WebEvents } from '@cl/types';
import { UnsubscribeGroups } from 'cl-common';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { ClassMaster, Personalization, sendTemplatedEmail } from '../mailer';
import {
  createClassParams,
  createRecipient,
  createStudentParams
} from '../mailer-utils';
import { apiRequest, gql } from './api-client';
import { Klass, KlassFragment, Student, StudentFragment } from './model-types';
import {
  takeDownConflicts,
  upsertCalendarEvent,
  upsertZoomMeeting
} from './updater-utils';

const GetClassQuery = gql`
  ${KlassFragment}
  query($classId: ID!) {
    klass: class(id: $classId) {
      ...KlassFragment
    }
  }
`;

export async function handleClassCreated(
  payload: WebEvents.ClassCreatedEvent['payload'],
  fLogger: Logger
) {
  const { klass } = await apiRequest<{ klass: Klass }, Graphql.ClassIdArgs>(
    GetClassQuery,
    payload
  );

  if (klass.teacher) {
    fLogger.info('take down conflicting classes');
    await takeDownConflicts(klass);
    fLogger.info('create Google calendar event');
    await upsertCalendarEvent(klass);
  }
}

const GetClassWithStudentsQuery = gql`
  ${KlassFragment}
  ${StudentFragment}
  query($classId: ID!) {
    klass: class(id: $classId) {
      ...KlassFragment
      students {
        ...StudentFragment
      }
    }
  }
`;

interface KlassWithStudents extends Klass {
  students: Student[];
}

export async function handleClassUpdated(
  payload: WebEvents.ClassUpdatedEvent['payload'],
  fLogger: Logger
) {
  const { klass } = await apiRequest<
    { klass: KlassWithStudents },
    Graphql.ClassIdArgs
  >(GetClassWithStudentsQuery, { classId: payload.classId });

  if (
    (klass.dialInLink && payload.scheduleChanged) ||
    (!klass.dialInLink && klass.students.length > 0)
  ) {
    fLogger.info('update zoom meeting');
    await upsertZoomMeeting(klass);
  }

  fLogger.info('update calendar event');
  await upsertCalendarEvent(klass);

  if (klass.teacher && (payload.teacherChanged || payload.scheduleChanged)) {
    fLogger.info('take down conflicting classes');
    await takeDownConflicts(klass);
  }

  // notifications

  if (payload.scheduleChanged) {
    const now = DateTime.local();
    const upcoming: DateTime[] = [];
    klass.schedules.forEach(schedule => {
      const ts = DateTime.fromISO(schedule[0]);
      if (ts > now) {
        upcoming.push(ts);
      }
    });

    if (upcoming.length === 0) {
      return;
    }

    if (klass.students.length > 0) {
      fLogger.info('notify students of class schedule changes');
      const personalizations: Personalization[] = klass.students.map(student => ({
        to: createRecipient(student.parent),
        customArgs: {
          amp_user_id: student.parent.id
        },
        dynamicTemplateData: {
          ...createStudentParams(student),
          ...createClassParams(klass, klass.course),
          sessions: upcoming.map(dt =>
            dt.setZone(student.parent.timezone).toFormat('ffff')
          )
        }
      }));

      return sendTemplatedEmail({
        from: ClassMaster,
        templateId: 'd-bbb57babf1734aa8b6d2477e2da22eb3',
        asm: { groupId: UnsubscribeGroups.Classes },
        personalizations
      });
    }
  }
}
