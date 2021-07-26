import * as Sentry from '@sentry/node';
import Bottleneck from 'bottleneck';
import { defaultTimezone, tzOpts } from 'cl-common';
import { ClassModel, CourseModel } from 'cl-models';
import * as config from 'config';
import { GaxiosOptions, request } from 'gaxios';
import * as jwt from 'jsonwebtoken';
import { sample } from 'lodash';
import { DateTime } from 'luxon';
import { nanoid } from 'nanoid';
import { Logger } from 'pino';
import { format } from 'url';
import { getAvailableResources } from '../lib/google-calendar';

// https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
interface Meeting {
  id?: string;
  host_id?: string;
  /**
   * 1 instant meeting
   * 2 scheduled meeting
   * 3 recurring meeting with no fixed time
   * 8 recurring meeting with fixed time
   */
  type?: number;
  topic: string;
  agenda: string;
  status: 'waiting' | 'started' | 'finished';
  uuid: string;
  start_time?: string;
  start_url: string;
  join_url: string;
  timezone: string;
  duration: number;
  settings: {
    host_video: boolean;
    participant_video: boolean;
    mute_upon_entry: boolean;
    audio: 'both' | 'voip' | 'telephony';
    auto_recording: 'local' | 'cloud' | 'none';
    waiting_room: boolean;
  };
  encrypted_password?: string;
  password?: string;
}

export interface RecordingFile {
  id: string;
  play_url: string;
  download_url: string;
  status: string;
  recording_start: string;
  recording_end: string;
  recording_type: string;
  file_type: string;
}

export interface MeetingRecording {
  id: string;
  uuid: string;
  duration: number;
  recording_count: number;
  share_url: string;
  recording_files: RecordingFile[];
}

export interface RecordingSetting {
  on_demand: boolean;
  password: string;
  recording_authentication: boolean;
  viewer_download: boolean;
}

export interface PastMeeting {
  id: number;
  host_id: string;
  type: number;
  topic: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_minutes: number;
  participants_count: number;
}

export interface MeetingParticipant {
  id: string;
  name: string;
}

const apiKey = config.get('zoom.api.key') as string;
const apiSecret = config.get('zoom.api.secret') as string;

const rateLimiter = new Bottleneck({
  minTime: 250,
  maxConcurrent: 2
});

export const signAccessToken = () =>
  jwt.sign(
    {
      iss: apiKey,
      exp: Date.now() + 60 * 1000
    },
    apiSecret,
    { algorithm: 'HS256' }
  );

async function zoomRequest<T>(cfg: GaxiosOptions = {}) {
  return rateLimiter.schedule(() =>
    request<T>({
      baseURL: 'https://api.zoom.us/v2',
      timeout: 5000,
      ...cfg,
      headers: {
        Authorization: 'Bearer ' + signAccessToken()
      }
    })
  );
}

export async function getMeeting(zoomId: string, logger: Logger) {
  try {
    const res = await zoomRequest<Meeting>({
      url: `/meetings/${zoomId}`,
      retry: true
    });

    return {
      id: res.data.id,
      hostId: res.data.host_id,
      status: res.data.status,
      joinUrl: res.data.join_url,
      startUrl: res.data.start_url,
      dashboardUrl:
        res.data.status === 'started'
          ? format({
              host: 'https://zoom.us',
              pathname: '/account/metrics/livemeetingdetail',
              query: {
                meeting_id: res.data.uuid
              }
            })
          : 'https://zoom.us/account/metrics/pastmeetings'
    };
  } catch (err) {
    logger.error(err, 'fail to fetch zoom meeting');
    Sentry.captureException(err);
  }
}

export async function createMeeting(
  klass: ClassModel,
  course: CourseModel,
  logger: Logger
) {
  const availableHosts = await getAvailableResources(klass);
  if (availableHosts.length === 0) {
    return;
  }

  const selectedHost = sample(availableHosts);
  logger.info('find %s available for this class', selectedHost.name);

  const { data } = await zoomRequest<Meeting>({
    url: `/users/${selectedHost.id}/meetings`,
    method: 'POST',
    data: buildMeetingDetails(klass, course, nanoid(6))
  });

  const details = {
    ...klass.details,
    password: data.password,
    dialInLink: data.join_url,
    zoomId: data.id.toString()
  };

  if (
    data.encrypted_password &&
    !details.dialInLink.includes(data.encrypted_password)
  ) {
    details.dialInLink = data.join_url + '?pwd=' + data.encrypted_password;
  }

  await klass.update({
    zoomhostId: selectedHost.id,
    details
  });

  klass.zoomhost = selectedHost;
  logger.info({ zoomId: data.id }, 'zoom meeting created %o', data);

  return data;
}

export async function updateMeeting(
  klass: ClassModel,
  course: CourseModel,
  logger: Logger
) {
  if (!klass.zoomId) {
    return;
  }

  await zoomRequest({
    url: `/meetings/${klass.zoomId}`,
    method: 'PATCH',
    data: buildMeetingDetails(klass, course, klass.password)
  });

  logger.info({ zoomId: klass.zoomId }, 'zoom meeting updated');
}

export async function deleteMeeting(klass: ClassModel, logger: Logger) {
  if (!klass.zoomId) {
    return;
  }

  await zoomRequest({ url: `/meetings/${klass.zoomId}`, method: 'DELETE' });
  logger.info({ zoomId: klass.zoomId }, 'zoom meeting deleted');
}

export async function getMeetingRecordings(zoomId: string, logger: Logger) {
  try {
    const settings = await zoomRequest<RecordingSetting>({
      url: `/meetings/${zoomId}/recordings/settings`,
      method: 'GET'
    });

    const recordings = await zoomRequest<MeetingRecording>({
      url: `/meetings/${zoomId}/recordings`,
      method: 'GET'
    });

    return recordings.data.recording_files
      .filter(file => file.status === 'completed')
      .map(file => ({
        id: file.id,
        downloadUrl: file.download_url,
        playUrl: file.play_url,
        start: file.recording_start,
        end: file.recording_end,
        password: settings.data.password
      }));
  } catch (err) {
    if (err.code !== '404') {
      logger.error(err, 'fail to fetch meeting recordings');
      Sentry.captureException(err);
    }
  }

  return [];
}

export function parseZoomLink(dialInLink: string) {
  const link = new URL(dialInLink);
  return {
    dialInLink,
    password: link.searchParams.get('pwd'),
    zoomId: link.pathname.replace('/j/', '')
  };
}

// https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
export function buildMeetingDetails(
  klass: ClassModel,
  course: CourseModel,
  password: string
) {
  const dts = DateTime.fromJSDate(klass.startDate, tzOpts);

  let type = 2;
  let topic = course.name;

  if (course.isTrial) {
    topic += dts.toFormat(' (ffff)');
  } else if (course.isRegular) {
    type = 3;
    const dates = klass.schedules
      .map(schedule => DateTime.fromJSDate(schedule[0], tzOpts).toFormat('L/dd'))
      .join(', ');
    topic += ` (${dts.toFormat('t')} ${dts.offsetNameLong}, ${dates})`;
  }

  const details: Omit<Meeting, 'uuid' | 'start_url' | 'join_url' | 'status'> = {
    topic,
    type,
    agenda: course.description,
    start_time: dts.toISO({ suppressMilliseconds: true, includeOffset: false }),
    timezone: defaultTimezone,
    duration: course.duration,
    settings: {
      host_video: true,
      participant_video: true,
      audio: 'both',
      auto_recording: 'cloud',
      mute_upon_entry: true,
      waiting_room: false
    }
  };

  if (klass.zoomId) {
    details.id = klass.zoomId;
  }

  if (klass.zoomhostId) {
    details.host_id = klass.zoomhostId;
  }

  if (password) {
    details.password = password;
  }

  return details;
}
