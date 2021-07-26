import * as Sentry from '@sentry/node';
import * as config from 'config';
import logger from '../logger';
import { handleAccountCreated } from './account-created';
import { runCronJob } from './api-client';
import { handleClassEnrolled } from './class-enrolled';
import { handleClassCreated, handleClassUpdated } from './class-update-handler';
import { downloadZoomRecording } from './zoomtopia';

async function handleCloudwatchEvent(type: string, payload: any) {
  logger.info(payload, 'receive %s event', type);

  switch (type) {
    case 'DOWNLOAD_RECORDING':
      await downloadZoomRecording(
        payload,
        logger.child({ event: type, classId: payload.classId })
      );
      break;
    case 'ACCOUNT_CREATED':
      await handleAccountCreated(
        payload,
        logger.child({ event: type, userId: payload.id })
      );
      break;
    case 'CLASS_CREATED':
      await handleClassCreated(
        payload,
        logger.child({ event: type, classId: payload.classId })
      );
      break;
    case 'CLASS_UPDATED':
      await handleClassUpdated(
        payload,
        logger.child({ event: type, classId: payload.classId })
      );
      break;
    case 'CLASS_ENROLLED':
      await handleClassEnrolled(
        payload,
        logger.child({
          event: type,
          enrollmentId: payload.id,
          classId: payload.classId
        })
      );
      break;
  }
}

export async function handler(event: any) {
  Sentry.init(config.get('sentry'));

  try {
    if (event['detail-type']) {
      await handleCloudwatchEvent(event['detail-type'], event.detail);
    }

    if (event.type) {
      await runCronJob(event);
    }
  } catch (err) {
    logger.error(err, 'fail to handle webhook event');
    Sentry.withScope(scope => {
      scope.setTag('service', 'dispatcher');
      scope.setExtra('event', event);
      Sentry.captureException(err);
    });
    throw err;
  }
}
