"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleLastHourReminder = exports.sendLastdayReminder = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../../mailer");
const mailer_utils_1 = require("../../mailer-utils");
// 1 day before the class
async function sendLastdayReminder(now) {
    const tomorrow = now.plus({
        day: 1
    });
    const teacherIntroRecipients = [];
    const reminderRecipients = [];
    const sessions = await cl_models_1.SessionModel.findAll({
        where: {
            startDate: {
                [sequelize_1.Op.between]: [
                    tomorrow.startOf('day').toJSON(),
                    tomorrow.endOf('day').toJSON()
                ]
            }
        },
        include: [
            cl_models_1.StudentModel,
            {
                model: cl_models_1.ClassModel,
                where: { active: true },
                required: true,
                include: [
                    {
                        model: cl_models_1.CourseModel,
                        required: true,
                        where: {
                            official: true
                        }
                    },
                    {
                        model: cl_models_1.TeacherModel,
                        required: true
                    }
                ]
            }
        ]
    });
    for (const ses of sessions) {
        for (const student of ses.students) {
            if (!student.parent.classReminderNotification) {
                continue;
            }
            const classTime = luxon_1.DateTime.fromJSDate(ses.startDate, {
                zone: student.parent.timezone
            });
            const startDate = classTime.toFormat('cccc L/dd');
            const startTime = classTime.toFormat('t ZZZZZ');
            const to = mailer_utils_1.createRecipient(student.parent);
            if (ses.class.course.isTrial && ses.class.teacher.bio) {
                teacherIntroRecipients.push({
                    to,
                    customArgs: {
                        amp_user_id: student.parentId
                    },
                    dynamicTemplateData: {
                        startDate,
                        startTime,
                        ...mailer_utils_1.createStudentParams(student),
                        ...mailer_utils_1.createClassParams(ses.class, ses.class.course),
                        teacher_name: ses.class.teacher.firstName,
                        teacher_full: ses.class.teacher.fullName,
                        teacher_avatar: ses.class.teacher.avatar || cl_common_1.defaultAvatarUrl,
                        teacher_bio: ses.class.teacher.bio
                    }
                });
            }
            else if (ses.class.dialInLink) {
                reminderRecipients.push({
                    to,
                    customArgs: {
                        amp_user_id: student.parentId
                    },
                    dynamicTemplateData: {
                        ...mailer_utils_1.createStudentParams(student),
                        ...mailer_utils_1.createClassParams(ses.class, ses.class.course),
                        session: ses.idx + 1,
                        startDate,
                        startTime
                    }
                });
            }
        }
    }
    if (reminderRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-a5f2ae82e5f544f79046ee8833041cfa',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            from: mailer_1.MrReminder,
            replyTo: mailer_1.ClassMaster,
            personalizations: reminderRecipients,
            category: 'reminder'
        });
    }
    if (teacherIntroRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-3a864b9ae58842b7b0c81e5aa09ddba1',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            from: mailer_1.MsOps,
            personalizations: teacherIntroRecipients,
            category: 'reminder'
        });
    }
}
exports.sendLastdayReminder = sendLastdayReminder;
async function scheduleLastHourReminder(now) {
    const dt = now.plus({ hours: 2 });
    const sessions = await cl_models_1.SessionModel.findAll({
        where: {
            startDate: {
                [sequelize_1.Op.between]: [dt.startOf('hour').toJSON(), dt.endOf('hour').toJSON()]
            }
        },
        include: [
            cl_models_1.StudentModel,
            {
                model: cl_models_1.ClassModel,
                where: { active: true },
                required: true,
                include: [
                    {
                        model: cl_models_1.TeacherModel,
                        required: true
                    },
                    {
                        model: cl_models_1.CourseModel,
                        required: true,
                        where: {
                            official: true
                        }
                    }
                ]
            }
        ]
    });
    const recipients = [];
    sessions.forEach(ses => {
        const start = luxon_1.DateTime.fromJSDate(ses.startDate);
        const reminderTime = Math.round(start.minus({ hour: 1 }).toSeconds());
        ses.students.forEach(student => {
            if (student.parent.classReminderNotification) {
                recipients.push({
                    sendAt: reminderTime,
                    to: mailer_utils_1.createRecipient(student.parent),
                    customArgs: {
                        amp_user_id: student.parentId
                    },
                    dynamicTemplateData: {
                        startTime: start.setZone(student.parent.timezone).toFormat('ffff'),
                        ...mailer_utils_1.createStudentParams(student),
                        ...mailer_utils_1.createClassParams(ses.class, ses.class.course)
                    }
                });
            }
        });
    });
    if (recipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-9b42e64f929d4b68a66c42de190e51dd',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            from: mailer_1.MrReminder,
            replyTo: mailer_1.ClassMaster,
            personalizations: recipients,
            category: 'reminder'
        });
    }
}
exports.scheduleLastHourReminder = scheduleLastHourReminder;
