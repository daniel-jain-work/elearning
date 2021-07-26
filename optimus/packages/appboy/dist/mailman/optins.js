"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoEnroll = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const url_1 = require("url");
const mailer_1 = require("../mailer");
const mailer_utils_1 = require("../mailer-utils");
async function autoEnroll(classId, logger) {
    const klass = await cl_models_1.ClassModel.findByPk(classId, {
        rejectOnEmpty: true,
        include: [
            cl_models_1.CourseModel,
            {
                model: cl_models_1.EnrollmentModel,
                attributes: ['studentId']
            }
        ]
    });
    logger.info('%d students already registered for %s', klass.enrollments.length, klass.course.name);
    if (klass.startDate < new Date() || klass.course.official) {
        return;
    }
    const students = await cl_models_1.StudentModel.findAll({
        where: {
            id: {
                [sequelize_1.Op.notIn]: klass.enrollments.map(e => e.studentId)
            },
            ['details.optIns.' + klass.course.subjectId]: true
        }
    });
    logger.info('%d students will be auto enrolled', students.length);
    if (students.length === 0) {
        return;
    }
    await cl_models_1.EnrollmentModel.bulkCreate(students.map(s => ({
        classId: klass.id,
        studentId: s.id,
        source: 'auto-enroll'
    })));
    const classTime = luxon_1.DateTime.fromJSDate(klass.startDate);
    const recipients = students.map(s => ({
        to: mailer_utils_1.createRecipient(s.parent),
        customArgs: {
            amp_user_id: s.parentId
        },
        dynamicTemplateData: {
            ...mailer_utils_1.createStudentParams(s),
            ...mailer_utils_1.createClassParams(klass, klass.course),
            classTime: classTime.setZone(s.parent.timezone).toFormat('ffff'),
            optout: url_1.format({
                host: mailer_utils_1.siteUrl.main,
                pathname: '/optout/' + klass.course.subjectId,
                query: {
                    uid: s.parentId
                }
            })
        }
    }));
    await mailer_1.sendTemplatedEmail({
        templateId: 'd-edcffbc8b85843149126d0b6264a5ae4',
        from: mailer_1.ClassMaster,
        asm: { groupId: cl_common_1.UnsubscribeGroups.Announcements },
        personalizations: recipients
    });
}
exports.autoEnroll = autoEnroll;
