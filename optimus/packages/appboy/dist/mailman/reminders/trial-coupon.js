"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCouponExpiringAlerts = exports.sendFollowupCoupons = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../../mailer");
const mailer_utils_1 = require("../../mailer-utils");
async function sendFollowupCoupons(now) {
    const dt = now.minus({ hours: 2 });
    const records = await cl_models_1.EnrollmentModel.findAll({
        attributes: ['id', 'updatedAt'],
        where: {
            statusCode: 20,
            updatedAt: {
                [sequelize_1.Op.between]: [dt.startOf('hour').toJSON(), dt.endOf('hour').toJSON()]
            }
        },
        include: [
            {
                model: cl_models_1.ClassModel.unscoped(),
                where: {
                    endDate: {
                        [sequelize_1.Op.gt]: now.minus({ day: 1 }).toJSDate()
                    }
                },
                include: [
                    {
                        model: cl_models_1.TeacherModel,
                        required: true
                    },
                    {
                        model: cl_models_1.CourseModel,
                        where: { level: 0 },
                        required: true,
                        include: [cl_models_1.PromotionModel, cl_models_1.SubjectModel]
                    }
                ]
            },
            {
                model: cl_models_1.StudentModel,
                include: [
                    {
                        model: cl_models_1.ClassModel.unscoped(),
                        include: [cl_models_1.CourseModel]
                    }
                ]
            }
        ]
    });
    for (const { class: klass, student } of records) {
        const promo = klass.course.promotions.find(p => p.isValid);
        const hasUpgraded = student.classes.some(k => k.course.subjectId === klass.course.subjectId && k.course.level === 1);
        if (promo && !hasUpgraded) {
            await sendLevelUpCoupon(student, klass, promo);
        }
    }
}
exports.sendFollowupCoupons = sendFollowupCoupons;
async function sendLevelUpCoupon(student, klass, promo) {
    const emailOpts = {
        from: mailer_1.MsOps,
        to: mailer_utils_1.createRecipient(student.parent),
        asm: { groupId: cl_common_1.UnsubscribeGroups.Promotions },
        templateId: '',
        category: 'trial-followup',
        customArgs: {
            amp_user_id: student.parentId
        }
    };
    const totalTrials = student.classes.filter(k => k.course.isTrial && k.startDate < new Date()).length;
    if (student.parent.paid || totalTrials < 3) {
        emailOpts.templateId = 'd-94860ae256d7420e9ec83de967827a4a';
        emailOpts.dynamicTemplateData = {
            offer: {
                code: promo.code,
                rules: promo.description
            },
            ...mailer_utils_1.createStudentParams(student),
            ...mailer_utils_1.createClassParams(klass, klass.course),
            teacher_name: klass.teacher.firstName
        };
    }
    else {
        emailOpts.templateId = 'd-0c0ddcb9535f4342819222727aaa3f08';
        emailOpts.cc = mailer_1.MsOps;
        emailOpts.dynamicTemplateData = {
            ...mailer_utils_1.createStudentParams(student),
            ...mailer_utils_1.createClassParams(klass, klass.course)
        };
    }
    await mailer_1.sendTemplatedEmail(emailOpts, {
        source: 't2p',
        campaign: 'levelup'
    });
}
async function sendCouponExpiringAlerts(now) {
    const dt = now.minus({ hours: 46 });
    const records = await cl_models_1.EnrollmentModel.findAll({
        attributes: ['id', 'updatedAt'],
        where: {
            statusCode: 20
        },
        include: [
            cl_models_1.StudentModel,
            {
                model: cl_models_1.ClassModel.unscoped(),
                where: {
                    endDate: {
                        [sequelize_1.Op.between]: [dt.startOf('hour').toJSON(), dt.endOf('hour').toJSON()]
                    }
                },
                include: [
                    {
                        model: cl_models_1.TeacherModel,
                        required: true
                    },
                    {
                        model: cl_models_1.CourseModel,
                        where: { level: 0 },
                        required: true,
                        include: [cl_models_1.PromotionModel, cl_models_1.SubjectModel]
                    }
                ]
            }
        ]
    });
    const recipients = [];
    for (const record of records) {
        const { student, class: klass } = record;
        const promo = klass.course.promotions.find(p => p.isValid);
        if (student.parent.paid || !promo) {
            continue;
        }
        recipients.push({
            to: mailer_utils_1.createRecipient(record.student.parent),
            customArgs: {
                amp_user_id: record.student.parentId
            },
            dynamicTemplateData: {
                offer: {
                    code: promo.code,
                    rules: promo.description
                },
                ...mailer_utils_1.createClassParams(klass, klass.course),
                ...mailer_utils_1.createStudentParams(student),
                teacher_name: klass.teacher.firstName
            }
        });
    }
    if (recipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            from: mailer_1.MrReminder,
            personalizations: recipients,
            templateId: 'd-f60276406a3a437d928eee23a54fe9e6',
            category: 'trial-followup',
            asm: {
                groupId: cl_common_1.UnsubscribeGroups.Promotions
            }
        }, {
            source: 'expiring',
            campaign: 'followup'
        });
    }
}
exports.sendCouponExpiringAlerts = sendCouponExpiringAlerts;
