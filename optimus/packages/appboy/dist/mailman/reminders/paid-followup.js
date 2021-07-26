"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaidFollowups = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const url_1 = require("url");
const logger_1 = require("../../logger");
const mailer_1 = require("../../mailer");
const mailer_utils_1 = require("../../mailer-utils");
// for student finishing up session 3 with no followup class, send promo
// for student finishing up session 4 with no followup, notify ops
// for student finishing up sessino 4 send ceritificate
async function sendPaidFollowups(now) {
    const dt = now.minus({ day: 1 });
    const sessions = await cl_models_1.SessionModel.findAll({
        where: {
            idx: {
                [sequelize_1.Op.in]: [2, 3]
            },
            endDate: {
                [sequelize_1.Op.between]: [dt.startOf('day').toJSON(), dt.endOf('day').toJSON()]
            }
        },
        include: [
            {
                model: cl_models_1.StudentModel,
                required: true,
                include: [cl_models_1.ClassModel]
            },
            {
                model: cl_models_1.ClassModel,
                where: {
                    active: true,
                    teacherId: { [sequelize_1.Op.not]: null }
                },
                required: true,
                include: [
                    {
                        model: cl_models_1.CourseModel,
                        include: [cl_models_1.PromotionModel, cl_models_1.SubjectModel]
                    }
                ]
            }
        ]
    });
    const promoRecipients = [];
    const certificateRecipients = [];
    for (const ses of sessions) {
        const course = ses.class.course;
        if (ses.class.schedules.length !== 4 || !course.isRegular) {
            logger_1.default.info('non-regular class, skip');
            continue;
        }
        if (ses.idx === 2 && course.level < course.subject.exitLevel) {
            const promo = course.promotions.find(promo => promo.isValid);
            if (promo) {
                for (const student of ses.students) {
                    if (hasRenewed(ses.class, student)) {
                        logger_1.default.info('student has already purchased next level class, skip');
                        continue;
                    }
                    promoRecipients.push({
                        to: mailer_utils_1.createRecipient(student.parent),
                        customArgs: {
                            amp_user_id: student.parentId
                        },
                        dynamicTemplateData: {
                            offer: {
                                code: promo.code,
                                rules: promo.description
                            },
                            offerSignupUrl: mailer_utils_1.getSubjectUrl(course.subject),
                            ...mailer_utils_1.createStudentParams(student),
                            ...mailer_utils_1.createClassParams(ses.class, course)
                        }
                    });
                }
            }
        }
        if (ses.idx === 3) {
            for (const student of ses.students) {
                certificateRecipients.push({
                    to: mailer_utils_1.createRecipient(student.parent),
                    customArgs: {
                        amp_user_id: student.parentId
                    },
                    dynamicTemplateData: {
                        certificateUrl: url_1.format({
                            host: mailer_utils_1.siteUrl.main,
                            pathname: '/request-certificate',
                            query: {
                                key: Buffer.from(`${student.id}:${ses.classId}`).toString('base64')
                            }
                        }),
                        ...mailer_utils_1.createStudentParams(student),
                        ...mailer_utils_1.createClassParams(ses.class, course)
                    }
                });
            }
        }
    }
    if (promoRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-cbcae941a6de431282dbfe85565209ee',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            from: mailer_1.ClassMaster,
            personalizations: promoRecipients,
            category: 'paid-followup'
        }, {
            campaign: 'followup',
            source: 'ses3'
        });
    }
    if (certificateRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-66b778570bd745beb388300003ab252f',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            from: mailer_1.ClassMaster,
            personalizations: certificateRecipients,
            category: 'paid-followup'
        }, {
            campaign: 'followup',
            source: 'ses4'
        });
    }
}
exports.sendPaidFollowups = sendPaidFollowups;
function hasRenewed(klass, student) {
    for (const c of student.classes) {
        if (c.endDate > klass.endDate && klass.course.isRegular) {
            return true;
        }
    }
    return false;
}
