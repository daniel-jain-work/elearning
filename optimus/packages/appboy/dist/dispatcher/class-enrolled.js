"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleClassEnrolled = void 0;
const cl_common_1 = require("cl-common");
const luxon_1 = require("luxon");
const mailer_1 = require("../mailer");
const mailer_utils_1 = require("../mailer-utils");
const api_client_1 = require("./api-client");
const model_types_1 = require("./model-types");
const updater_utils_1 = require("./updater-utils");
const GetEnrollmentQuery = api_client_1.gql `
  ${model_types_1.KlassFragment}
  ${model_types_1.StudentFragment}
  query($id: ID!) {
    enrollment(id: $id) {
      id
      student {
        ...StudentFragment
        parent {
          attended
          paid
        }
      }
      klass: class {
        ...KlassFragment
        active
        numberOfRegistrations
        isCamp
      }
    }
  }
`;
const SendClassConfirmationEmailMutation = api_client_1.gql `
  mutation($id: ID!, $isReschedule: Boolean) {
    sendClassConfirmationEmail(id: $id, isReschedule: $isReschedule)
  }
`;
async function handleClassEnrolled(payload, logger) {
    const result = await api_client_1.apiRequest(GetEnrollmentQuery, { id: payload.id.toString() });
    if (!result.enrollment || result.enrollment.klass.id !== payload.classId) {
        throw new Error(`Unknown enrollment id: ${payload.id}`);
    }
    const { klass, student } = result.enrollment;
    let prior;
    if (!payload.isReschedule && klass.course.isRegular) {
        prior = await updater_utils_1.attributePurchase(payload.id);
    }
    // make sure we have zoomhost available before sending out confirmation
    if (!klass.dialInLink) {
        await updater_utils_1.upsertZoomMeeting(klass);
        if (!klass.dialInLink && klass.active) {
            await updater_utils_1.takendownClass(klass, logger);
            return;
        }
    }
    // send confirmation email
    await api_client_1.apiRequest(SendClassConfirmationEmailMutation, {
        id: payload.id.toString(),
        isReschedule: payload.isReschedule
    });
    if (!payload.isReschedule) {
        if ([cl_common_1.Topic.WEBINARS, cl_common_1.Topic.PE].includes(klass.course.subjectId)) {
            await sendOpenClassFollowup(student);
        }
        else if (klass.course.level === 1) {
            await sendAdditionalNote(student, klass, prior);
        }
    }
    if (!klass.teacher && (klass.course.isTrial || klass.course.level > 1)) {
        await updater_utils_1.autoAssignTeacher(klass, prior === null || prior === void 0 ? void 0 : prior.teacher);
        if (!klass.teacher && klass.active) {
            await updater_utils_1.takendownClass(klass, logger);
        }
    }
    if (klass.numberOfRegistrations >= klass.course.capacity) {
        logger.info('%s is full, try to backfill', klass.course.name);
        if (klass.course.isTrial || (klass.course.level === 1 && klass.isCamp)) {
            await updater_utils_1.createBackfill(klass);
        }
    }
}
exports.handleClassEnrolled = handleClassEnrolled;
async function sendOpenClassFollowup(student) {
    if (student.parent.attended || student.parent.paid) {
        return;
    }
    await mailer_1.sendTemplatedEmail({
        templateId: 'd-d9d047292ab148e585e9713c7dbaa9a0',
        from: mailer_1.MsOps,
        to: mailer_utils_1.createRecipient(student.parent),
        asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
        sendAt: Math.round(Date.now() / 1000) + 7200,
        customArgs: {
            amp_user_id: student.parent.id
        },
        dynamicTemplateData: mailer_utils_1.createStudentParams(student)
    });
}
async function sendAdditionalNote(student, klass, prior) {
    const local = luxon_1.DateTime.local();
    const start = luxon_1.DateTime.fromISO(klass.startDate, {
        zone: student.parent.timezone
    });
    // watch scratch video
    if (!prior && [cl_common_1.Topic.SN, cl_common_1.Topic.AS].includes(klass.course.subjectId)) {
        return mailer_1.sendTemplatedEmail({
            templateId: 'd-c3621b642c6a440e886ed619ef142db2',
            from: mailer_1.ClassMaster,
            to: mailer_utils_1.createRecipient(student.parent),
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            sendAt: Math.round(local.plus({ minutes: 15 }).toSeconds()),
            customArgs: {
                amp_user_id: student.parent.id
            },
            dynamicTemplateData: mailer_utils_1.createStudentParams(student)
        });
    }
    if (!prior &&
        start.diffNow('days').days > 3 &&
        [
            cl_common_1.Topic.AS,
            cl_common_1.Topic.DS,
            cl_common_1.Topic.AI,
            cl_common_1.Topic.MC,
            cl_common_1.Topic.ROBO,
            cl_common_1.Topic.DESIGN,
            cl_common_1.Topic.PY
        ].includes(klass.course.subjectId)) {
        return mailer_1.sendTemplatedEmail({
            templateId: 'd-4953d5b108344b8d81d2abd9f232d5ad',
            from: mailer_1.MsOps,
            to: mailer_utils_1.createRecipient(student.parent),
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            sendAt: Math.round(local.plus({ hour: 1 }).toSeconds()),
            customArgs: {
                amp_user_id: student.parent.id
            },
            dynamicTemplateData: {
                classDate: start.toFormat('DDD'),
                classListingUrl: klass.course.subject.listingUrl,
                ...mailer_utils_1.createClassParams(klass, klass.course),
                ...mailer_utils_1.createStudentParams(student)
            }
        });
    }
    if (klass.course.subjectId === cl_common_1.Topic.MC) {
        return mailer_1.sendTemplatedEmail({
            templateId: 'd-b84f5f67c1ac406dba71fdb103d91835',
            from: mailer_1.ClassMaster,
            to: mailer_utils_1.createRecipient(student.parent),
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            sendAt: Math.round(local.plus({ hours: 2 }).toSeconds()),
            customArgs: {
                amp_user_id: student.parent.id
            },
            dynamicTemplateData: mailer_utils_1.createStudentParams(student)
        });
    }
    if (klass.course.subjectId === cl_common_1.Topic.ROBO) {
        return mailer_1.sendTemplatedEmail({
            templateId: 'd-c65b173e8d3b41949821c794f7c5a993',
            from: mailer_1.ClassMaster,
            to: mailer_utils_1.createRecipient(student.parent),
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            sendAt: Math.round(local.plus({ hours: 2 }).toSeconds()),
            customArgs: {
                amp_user_id: student.parent.id
            },
            dynamicTemplateData: mailer_utils_1.createStudentParams(student)
        });
    }
}
