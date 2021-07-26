import { UserModel } from 'cl-models';
import * as config from 'config';
import { request } from 'gaxios';
import { Logger } from 'pino';

const opts = config.get('segment') as { enabled: boolean; key: string };
const authKey = Buffer.from(opts.key + ':').toString('base64');

// facebook standard events see https://developers.facebook.com/docs/facebook-pixel/reference
export interface SegmentEvent {
  event: string;
  timestamp?: Date;
  properties: Record<string, any>;
}

export async function track(user: UserModel, data: SegmentEvent, fLogger: Logger) {
  const payload = {
    ...data,
    userId: user.id,
    context: {
      timezone: user.timezone,
      address: {
        city: user.city,
        country: user.country
      },
      traits: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    }
  };

  if (opts.enabled) {
    await request({
      url: 'https://api.segment.io/v1/track',
      timeout: 5000,
      method: 'POST',
      retry: true,
      data: payload,
      headers: {
        Authorization: `Basic ${authKey}`
      }
    });
  }

  fLogger.info(payload, 'segment.track');
}
