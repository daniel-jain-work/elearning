import * as Sentry from '@sentry/node';
import { defaultTimezone, tzOpts } from 'cl-common';
import * as config from 'config';
import { DateTime } from 'luxon';
import logger from '../logger';
import { notifyCreditRewards } from './account-activity';
import { notifyClassroomActivities } from './classroom-activity';
import { moveUsersToNuringCampaign, runNurturingCampaign } from './nurturing';
import { autoEnroll } from './optins';
import { handleScheduledReminders } from './reminders';
import './sequelize';

Sentry.init(config.get('sentry'));

export async function handler(event: any) {
  const eLogger = logger.child(event);
  const now = event.ts
    ? DateTime.fromISO(event.ts, tzOpts)
    : DateTime.local().setZone(defaultTimezone);

  try {
    eLogger.info('handle mailman event');

    switch (event.type) {
      case 'NURTURING':
        await moveUsersToNuringCampaign(now, eLogger);
        await runNurturingCampaign(now, eLogger);
        break;
      case 'SCHEDULED_REMINDERS':
        await handleScheduledReminders(now, eLogger, event.options);
        break;
      case 'YOU_GOT_CREDITS':
        await notifyCreditRewards(now, eLogger);
        break;
      case 'CLASSROOM_ACTIVITY':
        await notifyClassroomActivities(now, eLogger);
        break;
      case 'AUTO_ENROLL':
        await autoEnroll(event.classId, eLogger);
        break;
    }
  } catch (err) {
    eLogger.error(err, 'fail to handle event');
    Sentry.withScope(scope => {
      scope.setTag('service', 'mailman');
      scope.setExtra('event', event);
      Sentry.captureException(err);
    });
    await Sentry.flush(2000);
    throw err;
  }
}
