import { captureException, withScope } from '@sentry/node';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { sendReflectionReminder, sendTeacherSchedules } from './for-teachers';
import { sendNoShowReminder } from './no-shows';
import { sendPaidFollowups } from './paid-followup';
import { sendReferralIntroduction } from './post-class';
import { scheduleLastHourReminder, sendLastdayReminder } from './pre-class';
import { sendScheduleSuggestions } from './suggest-changes';
import { sendCouponExpiringAlerts, sendFollowupCoupons } from './trial-coupon';
import { send2WeeksFollowups } from './trial-followups';

type ReminderType =
  | 'TeacherSchedules'
  | 'TeacherReflection'
  | 'PleaseUpdateAttendance'
  | 'OneDayBefore'
  | 'OneHourBefore'
  | 'ScheduleSuggestion'
  | 'StudentNoShows'
  | 'PaidFollowup'
  | 'TrialFollowupCoupon'
  | 'TrialFollowupSurvey'
  | 'TrialCouponExpiring'
  | 'TrialFollowup2Weeks'
  | 'IntroduceReferral';

// triggers every hour
const reminderRegistry: {
  type: ReminderType;
  isMyTurn: (dt: DateTime) => boolean;
  execute: (dt: DateTime) => Promise<void>;
}[] = [
  // teachers
  {
    // runs daily, send teacher next day's class schedule
    type: 'TeacherSchedules',
    isMyTurn: dt => dt.get('hour') === 19,
    execute: dt => sendTeacherSchedules(dt)
  },
  {
    // runs daily, send teacher reflection reminder
    type: 'TeacherReflection',
    isMyTurn: dt => dt.get('hour') === 20,
    execute: dt => sendReflectionReminder(dt)
  },
  // pre class
  {
    // runs daily, send out reminder for
    type: 'OneDayBefore',
    isMyTurn: dt => dt.get('hour') === 12,
    execute: dt => sendLastdayReminder(dt)
  },
  {
    // runs hourly
    type: 'OneHourBefore',
    isMyTurn: () => true,
    execute: dt => scheduleLastHourReminder(dt)
  },
  {
    // runs daily, look at classes starting in 4 days with only 1 student
    type: 'ScheduleSuggestion',
    isMyTurn: dt => dt.get('hour') === 15,
    execute: dt => sendScheduleSuggestions(dt)
  },
  // post class
  {
    // runs hourly, send reschedule reminder to student how missed class
    type: 'StudentNoShows',
    isMyTurn: () => true,
    execute: dt => sendNoShowReminder(dt)
  },
  {
    // runs hourly
    type: 'TrialFollowupCoupon',
    isMyTurn: () => true,
    execute: dt => sendFollowupCoupons(dt)
  },
  {
    // runs hourly
    type: 'TrialCouponExpiring',
    isMyTurn: () => true,
    execute: dt => sendCouponExpiringAlerts(dt)
  },
  {
    // runs daily, goes out 10am
    type: 'TrialFollowup2Weeks',
    isMyTurn: dt => dt.get('hour') === 10,
    execute: dt => send2WeeksFollowups(dt)
  },
  {
    // runs daily, introduce referral program after 1 paid session
    type: 'IntroduceReferral',
    isMyTurn: dt => dt.get('hour') === 11,
    execute: dt => sendReferralIntroduction(dt)
  },
  {
    // runs daily, offer certificate of completion after last (4th) paid session
    type: 'PaidFollowup',
    isMyTurn: dt => dt.get('hour') === 15,
    execute: dt => sendPaidFollowups(dt)
  }
];

export async function handleScheduledReminders(
  now: DateTime,
  fLogger: Logger,
  options?: ReminderType[]
) {
  for (const reminder of reminderRegistry) {
    let isMyTurn = reminder.isMyTurn(now);

    if (Array.isArray(options)) {
      // for testing purpose
      isMyTurn = options.includes(reminder.type);
    }

    if (isMyTurn) {
      try {
        await reminder.execute(now);
        fLogger.info(
          'time is %s, %s reminder ran successfully',
          now.toLocal(),
          reminder.type
        );
      } catch (err) {
        fLogger.error(err, 'failed to run %s reminder', reminder.type);
        withScope(scope => {
          scope.setExtra('reminder', reminder.type);
          captureException(err);
        });
      }
    }
  }
}
