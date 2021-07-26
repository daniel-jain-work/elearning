"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleBackupClass = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../lib/mailer");
const teacher_utils_1 = require("../lib/teacher-utils");
const schedule_config_1 = require("./schedule-config");
const schedule_generator_1 = require("./schedule-generator");
async function scheduleBackupClass(klass, course, fLogger) {
    const now = luxon_1.DateTime.local().setZone(cl_common_1.defaultTimezone);
    const classTime = luxon_1.DateTime.fromJSDate(klass.startDate, cl_common_1.tzOpts);
    let cutoff = now.plus({ hours: 6 }); // by default starts
    if (now.get('hour') < schedule_config_1.shiftConfig.first[0]) {
        // early in the morning
        cutoff = now.set({ hour: 14 });
    }
    else if (now.get('hour') > schedule_config_1.shiftConfig.last[0]) {
        cutoff = now.plus({ day: 1 }).set({ hour: 12 });
    }
    if (classTime < cutoff) {
        fLogger.info('skip:: not enough time before class starts');
        return;
    }
    const start = classTime.startOf('day').toJSDate();
    const end = classTime.endOf('day').toJSDate();
    const openClasses = await cl_models_1.ClassModel.scope('countStudent').findAll({
        where: {
            active: true,
            courseId: klass.courseId,
            startDate: {
                [sequelize_1.Op.gte]: start,
                [sequelize_1.Op.lte]: end
            }
        },
        having: {
            numberOfRegistrations: {
                [sequelize_1.Op.lt]: course.capacity
            }
        }
    });
    if (openClasses.length > 1) {
        fLogger.info('skip:: still has %d open classes left', openClasses.length);
        return;
    }
    const potentialTeachers = await teacher_utils_1.getPotentialTeachers(start, end, klass.courseId);
    fLogger.info('found %d teachers', potentialTeachers.length);
    if (potentialTeachers.length > 0) {
        const occupancies = potentialTeachers.map(t => new teacher_utils_1.Occupancy(t));
        const shifts = classTime.get('hour') <= 12
            ? [...lodash_1.shuffle(schedule_config_1.shiftConfig.morning), ...schedule_config_1.shiftConfig.afternoon]
            : [...lodash_1.shuffle(schedule_config_1.shiftConfig.afternoon), ...schedule_config_1.shiftConfig.morning];
        for (const shift of shifts) {
            const dt = classTime.set({
                hour: shift[0],
                minute: shift[1],
                second: 0,
                millisecond: 0
            });
            if (dt < cutoff) {
                continue;
            }
            const backup = schedule_generator_1.buildClass(dt, course);
            const teacherNames = await findAvailableTeachers(backup, occupancies);
            if (!teacherNames) {
                fLogger.info('no teacher available at %s', dt.toFormat('DDD'));
                continue;
            }
            fLogger.info('found %d teachers available at %s', teacherNames.length, dt.toFormat('fff'));
            await backup.save();
            await notifyClassAdded(klass, course, backup, teacherNames.join(', '));
            return backup;
        }
    }
}
exports.scheduleBackupClass = scheduleBackupClass;
async function findAvailableTeachers(klass, occupancies) {
    const candidates = occupancies.filter(c => c.available(klass));
    if (candidates.length === 0) {
        return;
    }
    const otherOpenKlasses = await cl_models_1.ClassModel.count({
        where: {
            courseId: klass.courseId,
            teacherId: { [sequelize_1.Op.is]: null },
            startDate: {
                [sequelize_1.Op.gte]: klass.startDate,
                [sequelize_1.Op.lt]: klass.endDate
            }
        }
    });
    if (otherOpenKlasses < candidates.length) {
        return candidates.map(c => c.teacher.firstName);
    }
}
async function notifyClassAdded(current, course, backfill, teacher) {
    const oldTime = luxon_1.DateTime.fromJSDate(current.startDate, cl_common_1.tzOpts).toFormat('fff');
    const classUrl = cl_common_1.getOpsClassUrl(backfill);
    const classTime = luxon_1.DateTime.fromJSDate(backfill.startDate, cl_common_1.tzOpts).toFormat('fff');
    const html = `
  <p>Hello!</p>
  <p><strong>${course.name}</strong> at ${oldTime} is fully booked, <a href="${classUrl}">a new one is backfilled at ${classTime}</a>.</p>
  <p>These teachers are available: ${teacher} for the class.</p>
  `;
    await mailer_1.sendEmail({ ToAddresses: [mailer_1.MrScheduler, mailer_1.MrCTO] }, {
        Subject: {
            Data: `${course.name} is fully booked, a new one is created at ${classTime}`
        },
        Body: {
            Html: {
                Data: html
            }
        }
    });
}
