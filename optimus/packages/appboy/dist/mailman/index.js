"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const Sentry = require("@sentry/node");
const cl_common_1 = require("cl-common");
const config = require("config");
const luxon_1 = require("luxon");
const logger_1 = require("../logger");
const account_activity_1 = require("./account-activity");
const classroom_activity_1 = require("./classroom-activity");
const nurturing_1 = require("./nurturing");
const optins_1 = require("./optins");
const reminders_1 = require("./reminders");
require("./sequelize");
Sentry.init(config.get('sentry'));
async function handler(event) {
    const eLogger = logger_1.default.child(event);
    const now = event.ts
        ? luxon_1.DateTime.fromISO(event.ts, cl_common_1.tzOpts)
        : luxon_1.DateTime.local().setZone(cl_common_1.defaultTimezone);
    try {
        eLogger.info('handle mailman event');
        switch (event.type) {
            case 'NURTURING':
                await nurturing_1.moveUsersToNuringCampaign(now, eLogger);
                await nurturing_1.runNurturingCampaign(now, eLogger);
                break;
            case 'SCHEDULED_REMINDERS':
                await reminders_1.handleScheduledReminders(now, eLogger, event.options);
                break;
            case 'YOU_GOT_CREDITS':
                await account_activity_1.notifyCreditRewards(now, eLogger);
                break;
            case 'CLASSROOM_ACTIVITY':
                await classroom_activity_1.notifyClassroomActivities(now, eLogger);
                break;
            case 'AUTO_ENROLL':
                await optins_1.autoEnroll(event.classId, eLogger);
                break;
        }
    }
    catch (err) {
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
exports.handler = handler;
