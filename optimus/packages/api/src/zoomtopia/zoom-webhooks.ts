import { WebEvents } from '@cl/types';
import { ClassActivityType } from 'cl-common';
import { ClassActivityLogModel, ClassModel } from 'cl-models';
import { DateTime } from 'luxon';
import { writeCloudwatchEvents } from '../lib/cloudwatch';
import logger from '../lib/logger';
import { RecordingFile, signAccessToken } from './zoom-api';

interface ZoomWebHook {
  event: string;
  payload: {
    account_id: string;
    object: {
      id: string;
      timezone: string;
      start_time?: string;
      end_time?: string;
      host_id: string;
      recording_files?: RecordingFile[];
      participant?: {
        id?: string;
        user_id: string;
        user_name: string;
        join_time?: string;
        leave_time?: string;
        sharing_details?: {
          date_time: string;
        };
      };
    };
  };
}

const zoomEvents = new Map([
  ['meeting.participant_joined', ClassActivityType.ParticipantJoined],
  ['meeting.participant_left', ClassActivityType.ParticipantLeft],
  ['meeting.started', ClassActivityType.MeetingStarted],
  ['meeting.ended', ClassActivityType.MeetingEnded],
  ['meeting.sharing_started', ClassActivityType.MeetingSharingStarted],
  ['meeting.sharing_ended', ClassActivityType.MeetingSharingEnded]
]);

export async function handleWebhook({ payload, event }: ZoomWebHook) {
  // work around zoom bug that sends id as integer from time to time
  const meetingId = '' + payload.object.id;
  const fLogger = logger.child({ event, meetingId });

  const klass = await ClassModel.findOne({
    where: {
      'details.zoomId': meetingId
    }
  });

  if (!klass) {
    fLogger.error({ payload }, 'cannot find zoom meeting for the class');
    return;
  }

  if (event === 'recording.completed') {
    if (payload.object?.recording_files.length > 0) {
      const accessToken = signAccessToken();
      const events: WebEvents.DownloadRecordingEvent[] = payload.object.recording_files.map(
        file => ({
          type: 'DOWNLOAD_RECORDING',
          payload: {
            classId: klass.id,
            timestamp: new Date(file.recording_start).getTime(),
            fileType: file.file_type,
            recordingType: file.recording_type,
            downloadUrl: file.download_url + '?access_token=' + accessToken
          }
        })
      );

      fLogger.info(
        { classId: klass.id, files: payload.object.recording_files },
        'recordings ready'
      );

      await writeCloudwatchEvents(events);
    }

    return;
  }

  const activityType = zoomEvents.get(event);
  if (!activityType) {
    fLogger.error('unsupported event %s', event);
    return;
  }

  if (payload.object.participant) {
    if (payload.object.host_id === payload.object.participant.id) {
      payload.object.participant.user_name = 'Meeting Host';
    } else if (payload.object.participant.user_name?.length > 50) {
      // https://devforum.zoom.us/t/invalid-characters-in-user-name-when-receiving-event-notifications/6123/9
      // there is a zoom bug that returns werid character in webhook event, drop those for now
      fLogger.warn('bad user name %s', payload.object.participant.user_name);
      return;
    }
  }

  let eventTime: DateTime;

  switch (activityType) {
    case ClassActivityType.ParticipantJoined:
      if (payload.object.participant?.join_time) {
        eventTime = DateTime.fromISO(payload.object.participant.join_time, {
          zone: payload.object.timezone
        });
      }
      break;
    case ClassActivityType.ParticipantLeft:
      if (payload.object.participant?.leave_time) {
        eventTime = DateTime.fromISO(payload.object.participant.leave_time, {
          zone: payload.object.timezone
        });
      }
      break;
    case ClassActivityType.MeetingStarted:
      if (payload.object.start_time) {
        eventTime = DateTime.fromISO(payload.object.start_time, {
          zone: payload.object.timezone
        });
      }
      break;
    case ClassActivityType.MeetingEnded:
      if (payload.object.end_time) {
        eventTime = DateTime.fromISO(payload.object.end_time, {
          zone: payload.object.timezone
        });
      }
      break;
    case ClassActivityType.MeetingSharingStarted:
      if (payload.object.participant?.sharing_details) {
        eventTime = DateTime.fromISO(
          payload.object.participant.sharing_details.date_time,
          { zone: payload.object.timezone }
        );
      }
      break;
    case ClassActivityType.MeetingSharingEnded:
      if (payload.object.participant?.sharing_details) {
        eventTime = DateTime.fromISO(
          payload.object.participant.sharing_details.date_time,
          { zone: payload.object.timezone }
        );
      }
      break;
  }

  if (!eventTime) {
    eventTime = DateTime.local();
  }

  const session = klass.sessions.find(ses => {
    if (ses.startDate > eventTime.plus({ minutes: 45 }).toJSDate()) {
      return false;
    }

    if (ses.endDate < eventTime.minus({ minutes: 45 }).toJSDate()) {
      return false;
    }

    return true;
  });

  if (!session) {
    fLogger.warn(
      'event %s happens at %s, way out of class time',
      event,
      eventTime.toFormat('fff')
    );
    return;
  }

  fLogger.info(
    { classId: klass.id },
    'webhook event %s recorded for session %d',
    event,
    session.idx + 1
  );

  const ts = eventTime.toJSDate();
  await ClassActivityLogModel.findOrCreate({
    where: {
      sessionId: session.id,
      type: activityType,
      createdAt: ts
    },
    defaults: {
      sessionId: session.id,
      type: activityType,
      details: payload.object,
      createdAt: ts,
      updatedAt: ts
    }
  });
}
