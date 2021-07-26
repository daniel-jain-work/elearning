"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeSchedules = exports.scheduleClasses = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const teacher_utils_1 = require("../lib/teacher-utils");
const schedule_config_1 = require("./schedule-config");
const schedule_generator_1 = require("./schedule-generator");
// in production, ran previous night
async function scheduleClasses(fLogger, ts) {
    const dt = ts
        ? luxon_1.DateTime.fromJSDate(ts, cl_common_1.tzOpts)
        : luxon_1.DateTime.local().setZone(cl_common_1.defaultTimezone);
    const planned = [
        ...(await schedule_generator_1.getPreschedules(dt.plus({ day: 2 }), schedule_config_1.trialSchedules, fLogger)),
        ...(await schedule_generator_1.getPreschedules(dt.plus({ day: 3 }), schedule_config_1.trialSchedules, fLogger)),
        ...(await schedule_generator_1.getPreschedules(dt.plus({ days: 7 }), schedule_config_1.trialSchedules, fLogger)),
        ...(await schedule_generator_1.getPreschedules(dt.plus({ week: 3 }), schedule_config_1.paidSchedules, fLogger))
    ];
    if (planned.length === 0) {
        return;
    }
    const teachers = await teacher_utils_1.getPotentialTeachers(luxon_1.DateTime.fromJSDate(planned[0].startDate, cl_common_1.tzOpts).startOf('day').toJSDate(), luxon_1.DateTime.fromJSDate(planned[planned.length - 1].startDate, cl_common_1.tzOpts)
        .endOf('day')
        .toJSDate());
    const occupancies = teachers.map(t => new teacher_utils_1.Occupancy(t));
    const dataItems = [];
    for (const k of planned) {
        const candidates = [];
        for (const oc of occupancies) {
            if (oc.available(k)) {
                candidates.push(oc.teacher.firstName);
            }
        }
        if (candidates.length === 0) {
            fLogger.warn('no teacher available to teach %s', k.courseId);
            continue;
        }
        const existing = await cl_models_1.ClassModel.unscoped().findOne({
            where: {
                courseId: k.courseId,
                startDate: k.startDate
            }
        });
        if (existing) {
            fLogger.warn('class %s is created already', k.courseId);
            continue;
        }
        dataItems.push(k.toJSON());
    }
    if (dataItems.length > 0) {
        const klasses = await cl_models_1.ClassModel.bulkCreate(dataItems, {
            include: [cl_models_1.SessionModel]
        });
        for (const k of klasses) {
            fLogger.info({ classId: k.id }, 'class prescheduled');
        }
    }
    return dataItems;
}
exports.scheduleClasses = scheduleClasses;
function proposeSchedules(course, dt, range) {
    const candidates = [];
    if (course.official) {
        let cur = dt.setZone(cl_common_1.defaultTimezone);
        for (let i = 0; i < range; i++) {
            schedule_config_1.standardShifts.forEach(shift => {
                const classTime = cur.set({
                    hour: shift[0],
                    minute: shift[1],
                    second: 0,
                    millisecond: 0
                });
                if (classTime > dt) {
                    candidates.push(schedule_generator_1.buildClass(classTime, course, true));
                }
            });
            cur = cur.plus({ day: 1 });
        }
    }
    return candidates;
}
exports.proposeSchedules = proposeSchedules;
