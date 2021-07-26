"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleScheduledReminders = void 0;
const node_1 = require("@sentry/node");
const for_teachers_1 = require("./for-teachers");
const no_shows_1 = require("./no-shows");
const paid_followup_1 = require("./paid-followup");
const post_class_1 = require("./post-class");
const pre_class_1 = require("./pre-class");
const suggest_changes_1 = require("./suggest-changes");
const trial_coupon_1 = require("./trial-coupon");
const trial_followups_1 = require("./trial-followups");
// triggers every hour
const reminderRegistry = [
    // teachers
    {
        // runs daily, send teacher next day's class schedule
        type: 'TeacherSchedules',
        isMyTurn: dt => dt.get('hour') === 19,
        execute: dt => for_teachers_1.sendTeacherSchedules(dt)
    },
    {
        // runs daily, send teacher reflection reminder
        type: 'TeacherReflection',
        isMyTurn: dt => dt.get('hour') === 20,
        execute: dt => for_teachers_1.sendReflectionReminder(dt)
    },
    // pre class
    {
        // runs daily, send out reminder for
        type: 'OneDayBefore',
        isMyTurn: dt => dt.get('hour') === 12,
        execute: dt => pre_class_1.sendLastdayReminder(dt)
    },
    {
        // runs hourly
        type: 'OneHourBefore',
        isMyTurn: () => true,
        execute: dt => pre_class_1.scheduleLastHourReminder(dt)
    },
    {
        // runs daily, look at classes starting in 4 days with only 1 student
        type: 'ScheduleSuggestion',
        isMyTurn: dt => dt.get('hour') === 15,
        execute: dt => suggest_changes_1.sendScheduleSuggestions(dt)
    },
    // post class
    {
        // runs hourly, send reschedule reminder to student how missed class
        type: 'StudentNoShows',
        isMyTurn: () => true,
        execute: dt => no_shows_1.sendNoShowReminder(dt)
    },
    {
        // runs hourly
        type: 'TrialFollowupCoupon',
        isMyTurn: () => true,
        execute: dt => trial_coupon_1.sendFollowupCoupons(dt)
    },
    {
        // runs hourly
        type: 'TrialCouponExpiring',
        isMyTurn: () => true,
        execute: dt => trial_coupon_1.sendCouponExpiringAlerts(dt)
    },
    {
        // runs daily, goes out 10am
        type: 'TrialFollowup2Weeks',
        isMyTurn: dt => dt.get('hour') === 10,
        execute: dt => trial_followups_1.send2WeeksFollowups(dt)
    },
    {
        // runs daily, introduce referral program after 1 paid session
        type: 'IntroduceReferral',
        isMyTurn: dt => dt.get('hour') === 11,
        execute: dt => post_class_1.sendReferralIntroduction(dt)
    },
    {
        // runs daily, offer certificate of completion after last (4th) paid session
        type: 'PaidFollowup',
        isMyTurn: dt => dt.get('hour') === 15,
        execute: dt => paid_followup_1.sendPaidFollowups(dt)
    }
];
async function handleScheduledReminders(now, fLogger, options) {
    for (const reminder of reminderRegistry) {
        let isMyTurn = reminder.isMyTurn(now);
        if (Array.isArray(options)) {
            // for testing purpose
            isMyTurn = options.includes(reminder.type);
        }
        if (isMyTurn) {
            try {
                await reminder.execute(now);
                fLogger.info('time is %s, %s reminder ran successfully', now.toLocal(), reminder.type);
            }
            catch (err) {
                fLogger.error(err, 'failed to run %s reminder', reminder.type);
                node_1.withScope(scope => {
                    scope.setExtra('reminder', reminder.type);
                    node_1.captureException(err);
                });
            }
        }
    }
}
exports.handleScheduledReminders = handleScheduledReminders;
