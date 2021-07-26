"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReferralIntroduction = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const url_1 = require("url");
const mailer_1 = require("../../mailer");
const mailer_utils_1 = require("../../mailer-utils");
async function sendReferralIntroduction(now) {
    const dt = now.minus({ day: 1 });
    const attendants = await cl_models_1.AttendanceModel.findAll({
        where: {
            statusCode: {
                [sequelize_1.Op.gt]: 0
            }
        },
        include: [
            cl_models_1.StudentModel,
            {
                model: cl_models_1.SessionModel,
                required: true,
                where: {
                    idx: 0,
                    startDate: {
                        [sequelize_1.Op.between]: [dt.startOf('day').toJSON(), dt.endOf('day').toJSON()]
                    }
                },
                include: [
                    {
                        model: cl_models_1.ClassModel.unscoped(),
                        include: [cl_models_1.CourseModel]
                    }
                ]
            }
        ]
    });
    const recipients = [];
    for (const { student, session } of attendants) {
        if (session.class.course.isRegular && session.class.course.level === 1) {
            recipients.push({
                to: mailer_utils_1.createRecipient(student.parent),
                customArgs: {
                    amp_user_id: student.parentId
                },
                dynamicTemplateData: {
                    ...mailer_utils_1.createStudentParams(student),
                    referralUrl: url_1.format({
                        host: mailer_utils_1.siteUrl.main,
                        pathname: '/ref/' + student.parent.referralCode
                    })
                }
            });
        }
    }
    if (recipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-3352ee305cea4b90b83dd68443f3b76a',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Announcements },
            from: mailer_1.MsOps,
            personalizations: recipients,
            category: 'referral-program'
        }, {
            campaign: 'referral',
            source: 'introduction'
        });
    }
}
exports.sendReferralIntroduction = sendReferralIntroduction;
