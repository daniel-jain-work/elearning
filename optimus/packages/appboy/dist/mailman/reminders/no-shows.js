"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNoShowReminder = exports.getNoShowRecords = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../../mailer");
const mailer_utils_1 = require("../../mailer-utils");
// teacher don't immediately tag attendances
// Get noshow tags happend in the last hour and filter out classes way passed
async function getNoShowRecords(now) {
    const dt = now.minus({ hours: 1 });
    const cutoff = dt.minus({ day: 2 }).toJSDate();
    return cl_models_1.AttendanceModel.findAll({
        where: {
            statusCode: {
                [sequelize_1.Op.lt]: 0
            },
            updatedAt: {
                [sequelize_1.Op.gte]: dt.startOf('hour').toJSDate(),
                [sequelize_1.Op.lt]: dt.endOf('hour').toJSDate()
            }
        },
        include: [
            cl_models_1.StudentModel,
            {
                model: cl_models_1.SessionModel,
                required: true,
                where: {
                    startDate: {
                        [sequelize_1.Op.gt]: cutoff
                    }
                },
                include: [
                    {
                        model: cl_models_1.ClassModel.unscoped(),
                        include: [
                            cl_models_1.TeacherModel,
                            {
                                model: cl_models_1.CourseModel,
                                include: [cl_models_1.SubjectModel]
                            }
                        ]
                    }
                ]
            }
        ]
    });
}
exports.getNoShowRecords = getNoShowRecords;
async function sendNoShowReminder(now) {
    var _a;
    const records = await getNoShowRecords(now);
    if (records.length === 0) {
        return;
    }
    const trialRecipients = [];
    const scratchRecipients = [];
    const paidRecipients = [];
    for (const { student, session } of records) {
        const course = session.class.course;
        if (course.isRegular) {
            paidRecipients.push({
                to: mailer_utils_1.createRecipient(student.parent),
                cc: (_a = session.class.teacher) === null || _a === void 0 ? void 0 : _a.email,
                customArgs: {
                    amp_user_id: student.parentId
                },
                dynamicTemplateData: {
                    ...mailer_utils_1.createStudentParams(student),
                    ...mailer_utils_1.createClassParams(session.class, course),
                    classListingUrl: mailer_utils_1.getSubjectUrl(course.subject),
                    classIdx: session.idx + 1
                }
            });
        }
        else if (course.subjectId === cl_common_1.Topic.SN) {
            scratchRecipients.push({
                to: mailer_utils_1.createRecipient(student.parent),
                customArgs: {
                    amp_user_id: student.parentId
                },
                dynamicTemplateData: {
                    ...mailer_utils_1.createStudentParams(student),
                    ...mailer_utils_1.createClassParams(session.class, course),
                    classListingUrl: mailer_utils_1.getSubjectUrl(course.subject)
                }
            });
        }
        else if (course.isTrial) {
            trialRecipients.push({
                to: mailer_utils_1.createRecipient(student.parent),
                customArgs: {
                    amp_user_id: student.parentId
                },
                dynamicTemplateData: {
                    ...mailer_utils_1.createStudentParams(student),
                    ...mailer_utils_1.createClassParams(session.class, course),
                    classListingUrl: mailer_utils_1.getSubjectUrl(course.subject)
                }
            });
        }
    }
    if (scratchRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-bd564e4da3f943179fc010925ab7f4b0',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            category: 'trial-noshow',
            from: mailer_1.MsOps,
            personalizations: scratchRecipients
        }, {
            campaign: 'followup',
            source: 'noshow'
        });
    }
    if (trialRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-59a460eac4c44e269a939f723d9d2ce6',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            category: 'trial-noshow',
            from: mailer_1.MsOps,
            personalizations: trialRecipients
        }, {
            campaign: 'followup',
            source: 'noshow'
        });
    }
    if (paidRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-dc9cf4c90f9c47e6bf7358b833c56399',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            from: mailer_1.ClassMaster,
            personalizations: paidRecipients
        }, {
            campaign: 'followup',
            source: 'noshow'
        });
    }
}
exports.sendNoShowReminder = sendNoShowReminder;
