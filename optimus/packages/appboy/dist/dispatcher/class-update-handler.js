"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleClassUpdated = exports.handleClassCreated = void 0;
const cl_common_1 = require("cl-common");
const luxon_1 = require("luxon");
const mailer_1 = require("../mailer");
const mailer_utils_1 = require("../mailer-utils");
const api_client_1 = require("./api-client");
const model_types_1 = require("./model-types");
const updater_utils_1 = require("./updater-utils");
const GetClassQuery = api_client_1.gql `
  ${model_types_1.KlassFragment}
  query($classId: ID!) {
    klass: class(id: $classId) {
      ...KlassFragment
    }
  }
`;
async function handleClassCreated(payload, fLogger) {
    const { klass } = await api_client_1.apiRequest(GetClassQuery, payload);
    if (klass.teacher) {
        fLogger.info('take down conflicting classes');
        await updater_utils_1.takeDownConflicts(klass);
        fLogger.info('create Google calendar event');
        await updater_utils_1.upsertCalendarEvent(klass);
    }
}
exports.handleClassCreated = handleClassCreated;
const GetClassWithStudentsQuery = api_client_1.gql `
  ${model_types_1.KlassFragment}
  ${model_types_1.StudentFragment}
  query($classId: ID!) {
    klass: class(id: $classId) {
      ...KlassFragment
      students {
        ...StudentFragment
      }
    }
  }
`;
async function handleClassUpdated(payload, fLogger) {
    const { klass } = await api_client_1.apiRequest(GetClassWithStudentsQuery, { classId: payload.classId });
    if ((klass.dialInLink && payload.scheduleChanged) ||
        (!klass.dialInLink && klass.students.length > 0)) {
        fLogger.info('update zoom meeting');
        await updater_utils_1.upsertZoomMeeting(klass);
    }
    fLogger.info('update calendar event');
    await updater_utils_1.upsertCalendarEvent(klass);
    if (klass.teacher && (payload.teacherChanged || payload.scheduleChanged)) {
        fLogger.info('take down conflicting classes');
        await updater_utils_1.takeDownConflicts(klass);
    }
    // notifications
    if (payload.scheduleChanged) {
        const now = luxon_1.DateTime.local();
        const upcoming = [];
        klass.schedules.forEach(schedule => {
            const ts = luxon_1.DateTime.fromISO(schedule[0]);
            if (ts > now) {
                upcoming.push(ts);
            }
        });
        if (upcoming.length === 0) {
            return;
        }
        if (klass.students.length > 0) {
            fLogger.info('notify students of class schedule changes');
            const personalizations = klass.students.map(student => ({
                to: mailer_utils_1.createRecipient(student.parent),
                customArgs: {
                    amp_user_id: student.parent.id
                },
                dynamicTemplateData: {
                    ...mailer_utils_1.createStudentParams(student),
                    ...mailer_utils_1.createClassParams(klass, klass.course),
                    sessions: upcoming.map(dt => dt.setZone(student.parent.timezone).toFormat('ffff'))
                }
            }));
            return mailer_1.sendTemplatedEmail({
                from: mailer_1.ClassMaster,
                templateId: 'd-bbb57babf1734aa8b6d2477e2da22eb3',
                asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
                personalizations
            });
        }
    }
}
exports.handleClassUpdated = handleClassUpdated;
