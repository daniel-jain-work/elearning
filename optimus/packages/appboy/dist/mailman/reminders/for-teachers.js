"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReflectionReminder = exports.sendTeacherSchedules = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const logger_1 = require("../../logger");
const mailer_1 = require("../../mailer");
const mailer_utils_1 = require("../../mailer-utils");
const sequelize_2 = require("../sequelize");
// runs daily late in the afternoon
async function sendTeacherSchedules(now) {
    const tomorrow = now.plus({ day: 1 });
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
            {
                model: cl_models_1.ClassModel,
                required: true,
                include: [
                    cl_models_1.CourseModel,
                    {
                        model: cl_models_1.TeacherModel,
                        required: true
                    },
                    {
                        model: cl_models_1.TeacherModel,
                        as: 'observers'
                    }
                ]
            }
        ]
    });
    const assignments = new Map();
    function addAssignment(teacher, ses) {
        const result = assignments.get(teacher.id) || [teacher, []];
        result[1].push(ses);
        assignments.set(teacher.id, result);
    }
    for (const ses of sessions) {
        addAssignment(ses.class.teacher, ses);
        for (const observer of ses.class.observers) {
            addAssignment(observer, ses);
        }
    }
    if (assignments.size > 0) {
        const personalizations = [];
        for (const result of assignments.values()) {
            const teacher = result[0];
            personalizations.push({
                to: mailer_utils_1.createRecipient(teacher),
                dynamicTemplateData: {
                    teacher_name: teacher.firstName,
                    tasks: result[1].map(ses => ({
                        courseName: ses.class.course.name,
                        observer: ses.class.teacherId !== teacher.id,
                        classTime: luxon_1.DateTime.fromJSDate(ses.startDate, {
                            zone: teacher.timezone
                        }).toFormat('tttt')
                    }))
                }
            });
        }
        logger_1.default.info('send teacher schedules to %o', personalizations);
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-d6241ed546d1401889b693b593545d64',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            from: mailer_1.ClassMaster,
            personalizations,
            dynamicTemplateData: {
                classDate: tomorrow.toFormat('cccc, LLL d')
            }
        });
    }
}
exports.sendTeacherSchedules = sendTeacherSchedules;
const SelfEvaluateCriterionQuery = `
SELECT
  t.*,
  COUNT(c.id) numberOfTrials
FROM
  ${cl_models_1.TeacherModel.tableName} t
  INNER JOIN ${cl_models_1.ClassModel.tableName} c ON t.id = c.teacherId
  INNER JOIN ${cl_models_1.EnrollmentModel.tableName} e ON c.id = e.classId
  INNER JOIN ${cl_models_1.CourseModel.tableName} co ON c.courseId = co.id
WHERE
  c.startDate < NOW()
  AND t.deletedAt IS NULL
  AND e.statusCode > 0
  AND co.official AND co.level = 0
  AND t.id IN (:tids)
GROUP BY
  t.id
HAVING numberOfTrials = 3
`;
async function sendReflectionReminder(now) {
    // find all the teachers with trial classes today
    const trials = await cl_models_1.ClassModel.findAll({
        where: {
            startDate: {
                [sequelize_1.Op.between]: [now.minus({ day: 1 }).toJSON(), now.toJSON()]
            },
            teacherId: {
                [sequelize_1.Op.not]: null
            }
        },
        include: [
            {
                model: cl_models_1.CourseModel,
                where: {
                    official: true,
                    level: 0
                }
            }
        ]
    });
    if (trials.length === 0) {
        return;
    }
    const teachers = await sequelize_2.default.query(SelfEvaluateCriterionQuery, {
        type: sequelize_1.QueryTypes.SELECT,
        mapToModel: true,
        model: cl_models_1.TeacherModel,
        replacements: {
            tids: trials.map(t => t.teacherId)
        }
    });
    if (teachers.length > 0) {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-0a76e5ee025a4c1199868ebf16f75502',
            from: mailer_1.ClassMaster,
            personalizations: teachers.map(t => ({
                to: mailer_utils_1.createRecipient(t),
                customArgs: {
                    amp_user_id: t.id
                },
                dynamicTemplateData: {
                    teacher_name: t.firstName
                }
            }))
        });
    }
}
exports.sendReflectionReminder = sendReflectionReminder;
