import { captureException, withScope } from '@sentry/node';
import { defaultTimezone, tzOpts } from 'cl-common';
import { Request, Response } from 'express';
import { DateTime } from 'luxon';
import {
  sendMeetingNotStartedAlerts,
  sendTagAttendanceAlerts
} from './alerts/teacher-alerts';
import { syncContacts } from './contacts/sync-contacts';
import { cleanStock } from './inventory/cleaner';
import { scheduleClasses } from './inventory/planner';
import logger from './lib/logger';
import { updateTechnews } from './technews/newsman';

export const cronjobPath = '/cronjob/:event';

export async function cronjobHandler(
  req: Request<{ event: string }>,
  res: Response
) {
  let success = false;

  const fLogger = logger.child(req.params);
  const dt = req.body.ts
    ? DateTime.fromISO(req.body.ts, tzOpts)
    : DateTime.local().setZone(defaultTimezone);

  try {
    switch (req.params.event) {
      case 'DAILY_NEWS':
        await updateTechnews(fLogger, req.body.range);
        success = true;
        break;
      case 'CLEAN_STOCK':
        await cleanStock(fLogger);
        success = true;
        break;
      case 'SCHEDULE_CLASSES':
        await scheduleClasses(dt, fLogger);
        success = true;
        break;
      case 'SYNC_CONTACTS':
        await syncContacts(dt, fLogger);
        success = true;
        break;
      case 'CLASS_SHOULD_START':
        await sendMeetingNotStartedAlerts(dt, fLogger);
        success = true;
        break;
      case 'PLEASE_TAG_ATTENDANCE':
        await sendTagAttendanceAlerts(dt, fLogger);
        success = true;
        break;
    }
  } catch (err) {
    fLogger.error(err);
    withScope(scope => {
      scope.setExtras(req.params);
      captureException(err);
    });
  }

  if (!success) {
    res.status(500);
  }

  res.send({ success });
}
