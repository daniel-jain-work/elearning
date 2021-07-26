"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.send2WeeksFollowups = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../../mailer");
const mailer_utils_1 = require("../../mailer-utils");
const trialTemplates = {
    'data-science_0': 'd-1bdb827223d6476d99354defd685ac11',
    minecraft_0: 'd-0df3365099d6424d8c9fe1492e48ca85',
    'ai-explorers_0': 'd-fa08fd79770046aa9fddb99fadd5b77d',
    scratch_0: 'd-a78b8bd7b0184e16b335dd56fd9446fb',
    scratch_junior: 'd-a78b8bd7b0184e16b335dd56fd9446fb',
    ascratch_0: 'd-a78b8bd7b0184e16b335dd56fd9446fb'
};
async function getRecords(day) {
    return cl_models_1.EnrollmentModel.findAll({
        attributes: ['id'],
        where: {
            statusCode: 20
        },
        include: [
            {
                model: cl_models_1.StudentModel.unscoped(),
                required: true,
                include: [
                    {
                        model: cl_models_1.UserModel,
                        as: 'parent',
                        where: {
                            paid: false
                        }
                    }
                ]
            },
            {
                model: cl_models_1.ClassModel,
                required: true,
                include: [cl_models_1.CourseModel],
                where: {
                    courseId: {
                        [sequelize_1.Op.in]: Object.keys(trialTemplates)
                    },
                    endDate: {
                        [sequelize_1.Op.between]: [day.startOf('day').toJSON(), day.endOf('day').toJSON()]
                    }
                }
            }
        ]
    });
}
async function send2WeeksFollowups(now) {
    const recipients = {};
    for (const record of await getRecords(now.minus({ days: 14 }))) {
        const templateId = trialTemplates[record.class.courseId];
        if (!recipients[templateId]) {
            recipients[templateId] = [];
        }
        recipients[templateId].push({
            to: mailer_utils_1.createRecipient(record.student.parent),
            customArgs: { amp_user_id: record.student.parentId },
            dynamicTemplateData: {
                ...mailer_utils_1.createStudentParams(record.student),
                ...mailer_utils_1.createClassParams(record.class, record.class.course)
            }
        });
    }
    for (const templateId of Object.keys(recipients)) {
        await mailer_1.sendTemplatedEmail({
            from: mailer_1.MsOps,
            templateId,
            category: 'trial-followup',
            personalizations: recipients[templateId],
            asm: {
                groupId: cl_common_1.UnsubscribeGroups.Promotions
            }
        }, {
            campaign: 'followup',
            source: '2wk'
        });
    }
}
exports.send2WeeksFollowups = send2WeeksFollowups;
