"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendScheduleSuggestions = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../../mailer");
const mailer_utils_1 = require("../../mailer-utils");
const LOOK_AHEAD_DAYS = 15;
async function sendScheduleSuggestions(now) {
    const classTime = now.plus({ days: 4 });
    // look Y days ahead (after the planned starting time) to find the same classes
    const latestClassDate = classTime
        .plus({ days: LOOK_AHEAD_DAYS })
        .endOf('day')
        .toJSDate();
    const allClasses = await cl_models_1.ClassModel.findAll({
        include: [
            cl_models_1.CourseModel,
            {
                model: cl_models_1.StudentModel,
                required: true
            }
        ],
        where: {
            active: true,
            startDate: {
                [sequelize_1.Op.between]: [
                    classTime.startOf('day').toJSON(),
                    classTime.endOf('day').toJSON()
                ]
            }
        }
    });
    if (allClasses.length === 0) {
        return;
    }
    const recipients = [];
    for (const klass of allClasses) {
        if (klass.students.length !== 1 || !klass.course.isRegular) {
            continue;
        }
        // find classes with students happening within 7 dats after this class
        // the goal is really to try merge single student classes to be more efficient
        const candidates = await cl_models_1.ClassModel.findAll({
            order: [['startDate', 'ASC']],
            where: {
                courseId: klass.courseId,
                id: {
                    [sequelize_1.Op.not]: klass.id
                },
                startDate: {
                    [sequelize_1.Op.gt]: klass.startDate,
                    [sequelize_1.Op.lte]: latestClassDate
                }
            },
            include: [
                {
                    model: cl_models_1.EnrollmentModel,
                    attributes: ['id'],
                    required: true
                }
            ]
        });
        const nextClasses = candidates.filter(k => k.enrollments.length < klass.course.capacity);
        if (nextClasses.length == 0) {
            continue;
        }
        const student = klass.students[0];
        const dtOpts = { zone: student.parent.timezone };
        const suggestedClasses = nextClasses.map(k => ({
            classTime: luxon_1.DateTime.fromJSDate(k.startDate, dtOpts).toFormat('cccc t'),
            classDates: k.schedules
                .map(schedule => luxon_1.DateTime.fromJSDate(schedule[0], dtOpts).toFormat('D'))
                .join(', ')
        }));
        recipients.push({
            to: mailer_utils_1.createRecipient(student.parent),
            cc: mailer_1.ClassMaster,
            customArgs: {
                amp_user_id: student.parentId
            },
            dynamicTemplateData: {
                ...mailer_utils_1.createStudentParams(student),
                suggestedClasses,
                current: {
                    courseName: klass.course.name,
                    classTime: luxon_1.DateTime.fromJSDate(klass.startDate, dtOpts).toFormat('cccc t'),
                    classDates: klass.schedules
                        .map(schedule => luxon_1.DateTime.fromJSDate(schedule[0], dtOpts).toFormat('D'))
                        .join(', ')
                }
            }
        });
    }
    if (recipients.length > 0) {
        await mailer_1.sendTemplatedEmail({
            from: mailer_1.MsOps,
            templateId: 'd-87bd7fb2d35d4597ab73cb2094f87e31',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            personalizations: recipients
        });
    }
}
exports.sendScheduleSuggestions = sendScheduleSuggestions;
