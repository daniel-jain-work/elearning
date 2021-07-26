"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyClassroomActivities = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const url_1 = require("url");
const mailer_1 = require("../mailer");
const mailer_utils_1 = require("../mailer-utils");
// runs hourly
async function notifyClassroomActivities(now, logger) {
    const lastHour = now.minus({ hour: 1 });
    const threads = await cl_models_1.ThreadModel.findAll({
        where: {
            createdAt: {
                createdAt: {
                    [sequelize_1.Op.gte]: lastHour.startOf('hour').toJSDate(),
                    [sequelize_1.Op.lte]: lastHour.endOf('hour').toJSDate()
                }
            }
        },
        include: [
            cl_models_1.StudentModel,
            {
                model: cl_models_1.ClassModel,
                required: true,
                where: {
                    endDate: {
                        [sequelize_1.Op.gte]: now.minus({ days: 5 }).toJSDate()
                    }
                },
                include: [
                    cl_models_1.CourseModel,
                    { model: cl_models_1.TeacherModel, required: true },
                    { model: cl_models_1.StudentModel, required: true }
                ]
            }
        ]
    });
    const comments = await cl_models_1.CommentModel.findAll({
        where: {
            createdAt: {
                [sequelize_1.Op.gte]: lastHour.startOf('hour').toJSDate(),
                [sequelize_1.Op.lte]: lastHour.endOf('hour').toJSDate()
            }
        },
        include: [
            { model: cl_models_1.StudentModel, required: true },
            {
                model: cl_models_1.ThreadModel,
                required: true,
                include: [
                    {
                        model: cl_models_1.ClassModel,
                        where: {
                            endDate: {
                                [sequelize_1.Op.gte]: now.minus({ days: 5 }).toJSDate()
                            }
                        },
                        include: [cl_models_1.CourseModel, cl_models_1.TeacherModel]
                    }
                ]
            }
        ]
    });
    if (threads.length === 0 && comments.length === 0) {
        return;
    }
    const teacherRecipients = [];
    const studentRecipients = [];
    threads.forEach(thread => {
        const klass = thread.class;
        // student comment, notify class teacher
        if (thread.student) {
            logger.info({ classId: thread.classId, userId: thread.student.parentId }, 'a new thread started by student in the past hour');
            teacherRecipients.push({
                to: mailer_utils_1.createRecipient(klass.teacher),
                customArgs: {
                    amp_user_id: klass.teacher.id
                },
                dynamicTemplateData: {
                    ...mailer_utils_1.createClassParams(klass, klass.course),
                    ...mailer_utils_1.createStudentParams(thread.student),
                    teacher_name: klass.teacher.firstName,
                    quote: thread.content,
                    classroomUrl: url_1.format({
                        host: mailer_utils_1.siteUrl.teaching,
                        pathname: '/classroom/' + thread.classId
                    })
                }
            });
            return;
        }
        // teacher comment, notify all students
        if (thread.teacherId) {
            logger.info({ classId: thread.classId, teacherId: thread.teacherId }, 'a new thread started by teacher in the past hour');
            klass.students.forEach(student => {
                if (!student.parent.classroomActivityNotification) {
                    return;
                }
                studentRecipients.push({
                    to: mailer_utils_1.createRecipient(student.parent),
                    customArgs: {
                        amp_user_id: student.parentId
                    },
                    dynamicTemplateData: {
                        ...mailer_utils_1.createClassParams(klass, klass.course),
                        ...mailer_utils_1.createStudentParams(student),
                        teacher_name: klass.teacher.firstName,
                        quote: thread.content,
                        classroomUrl: url_1.format({
                            host: mailer_utils_1.siteUrl.main,
                            pathname: '/classroom/' + klass.id + '/' + student.id
                        })
                    }
                });
            });
        }
    });
    comments.forEach(comment => {
        const klass = comment.thread.class;
        // student comment, notify class teacher
        teacherRecipients.push({
            to: mailer_utils_1.createRecipient(klass.teacher),
            customArgs: {
                amp_user_id: klass.teacher.id
            },
            dynamicTemplateData: {
                ...mailer_utils_1.createClassParams(klass, klass.course),
                ...mailer_utils_1.createStudentParams(comment.student),
                teacher_name: klass.teacher.firstName,
                quote: comment.content,
                classroomUrl: url_1.format({
                    host: mailer_utils_1.siteUrl.teaching,
                    pathname: '/classroom/' + klass.id
                })
            }
        });
    });
    if (teacherRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-4007da12c1014ddea565aaa5f826c9e1',
            personalizations: teacherRecipients,
            from: mailer_1.ClassMaster,
            asm: {
                groupId: cl_common_1.UnsubscribeGroups.Classes
            }
        });
    }
    if (studentRecipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-2c5f9eecf38f482ea03872d53240c847',
            personalizations: studentRecipients,
            from: mailer_1.ClassMaster,
            asm: {
                groupId: cl_common_1.UnsubscribeGroups.Classes
            }
        });
    }
}
exports.notifyClassroomActivities = notifyClassroomActivities;
