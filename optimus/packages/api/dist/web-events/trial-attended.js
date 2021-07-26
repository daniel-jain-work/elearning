"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const catalog_cache_1 = require("../lib/catalog-cache");
const segment_1 = require("../lib/segment");
const sendgrid_1 = require("../lib/sendgrid");
async function handleTrialAttended(payload) {
    const student = await cl_models_1.StudentModel.findByPk(payload.studentId, {
        rejectOnEmpty: true,
        include: [
            {
                model: cl_models_1.EnrollmentModel,
                include: [cl_models_1.ClassModel],
                where: {
                    statusCode: {
                        [sequelize_1.Op.gt]: 0
                    }
                }
            }
        ]
    });
    await sendgrid_1.upsertContact(student, { trials: student.enrollments.length });
    const er = student.enrollments.find(er => er.classId === payload.classId);
    if (er) {
        const course = catalog_cache_1.getCourseById(er.class.courseId);
        await segment_1.track(student.parent, {
            event: 'AttendTrial',
            timestamp: er.class.startDate,
            properties: {
                content_name: course.name,
                content_ids: [course.id],
                subject: course.subjectId
            }
        });
    }
}
exports.handleTrialAttended = handleTrialAttended;
