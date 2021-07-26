import { WebEvents } from '@cl/types';
import { cloudWatchEvents } from './aws';
import logger from './logger';

const env = process.env.NODE_CONFIG_ENV || process.env.NODE_ENV || 'local';
const cloudWatchSource = 'api.' + env;

interface Event {
  type: string;
  payload: Record<string, any>;
}

const toEntry = (evt: Event) => ({
  DetailType: evt.type,
  Detail: JSON.stringify(evt.payload),
  Source: cloudWatchSource
});

export async function writeCloudwatchEvent<T extends Event>(evt: T) {
  try {
    await cloudWatchEvents
      .putEvents({
        Entries: [toEntry(evt)]
      })
      .promise();
  } catch (err) {
    logger.error(err, 'fail to emit cloudwatch events');
  }
}

export async function writeCloudwatchEvents<T extends Event>(events: T[]) {
  try {
    await cloudWatchEvents
      .putEvents({
        Entries: events.map(toEntry).slice(0, 10)
      })
      .promise();
  } catch (err) {
    logger.error(err, 'fail to emit cloudwatch events');
  }
}

export const emitClassCreatedEvent = (
  payload: WebEvents.ClassCreatedEvent['payload']
) =>
  writeCloudwatchEvent<WebEvents.ClassCreatedEvent>({
    type: 'CLASS_CREATED',
    payload
  });

export const emitClassUpdatedEvent = (
  payload: WebEvents.ClassUpdatedEvent['payload']
) =>
  writeCloudwatchEvent<WebEvents.ClassUpdatedEvent>({
    type: 'CLASS_UPDATED',
    payload
  });

export const emitClassEnrolledEvent = (
  payload: WebEvents.ClassEnrolledEvent['payload']
) =>
  writeCloudwatchEvent<WebEvents.ClassEnrolledEvent>({
    type: 'CLASS_ENROLLED',
    payload
  });

export const emitBlogUpdatedEvent = (
  payload: WebEvents.BlogUpdatedEvent['payload']
) =>
  writeCloudwatchEvent<WebEvents.BlogUpdatedEvent>({
    type: 'BLOG_UPDATED',
    payload
  });
