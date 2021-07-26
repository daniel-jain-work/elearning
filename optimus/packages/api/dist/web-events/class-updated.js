"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleClassFull = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const backfill_1 = require("../inventory/backfill");
const enrollment_emails_1 = require("../lib/enrollment-emails");
async function handleClassFull(payload, fLogger) {
    const klass = await cl_models_1.ClassModel.findByPk(payload.classId, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel]
    });
    if (klass.course.isTrial) {
        await backfill_1.scheduleBackupClass(klass, klass.course, fLogger);
    }
    if (klass.course.isRegular && klass.days < cl_common_1.campClassMaxDays) {
        const openCamp = await cl_models_1.ClassModel.scope('countStudent').findOne({
            where: {
                active: true,
                courseId: klass.courseId,
                startDate: {
                    [sequelize_1.Op.gt]: new Date()
                },
                days: {
                    [sequelize_1.Op.lt]: cl_common_1.campClassMaxDays
                }
            },
            having: {
                numberOfRegistrations: {
                    [sequelize_1.Op.lt]: klass.course.capacity
                }
            }
        });
        if (!openCamp) {
            await enrollment_emails_1.sendAllCampFullAlert(klass.course);
        }
    }
}
exports.handleClassFull = handleClassFull;
