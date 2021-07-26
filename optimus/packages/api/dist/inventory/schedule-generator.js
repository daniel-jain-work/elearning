"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildClass = exports.getPreschedules = exports.getNextWeek = exports.isRightWeek = exports.isHoliday = exports.regularClassLength = exports.startOfTime = void 0;
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const dataloader_1 = require("../lib/dataloader");
const schedule_config_1 = require("./schedule-config");
exports.startOfTime = luxon_1.DateTime.fromISO('2019-06-01T12:00:00.000Z');
exports.regularClassLength = 4;
function isHoliday(dt) {
    return schedule_config_1.holidays.includes(dt.toISODate());
}
exports.isHoliday = isHoliday;
function isRightWeek(schedule, dt) {
    if (schedule.weekday !== dt.weekday) {
        return false;
    }
    const offset = Math.floor(dt.diff(exports.startOfTime, 'weeks').weeks) % schedule.interval;
    return schedule.offset >= 0 ? schedule.offset === offset : offset === 0;
}
exports.isRightWeek = isRightWeek;
// skip holidays
function getNextWeek(ts) {
    let next = ts.plus({ week: 1 });
    while (isHoliday(next)) {
        next = next.plus({ week: 1 });
    }
    return next;
}
exports.getNextWeek = getNextWeek;
async function getPreschedules(dt, schedules, fLogger) {
    if (isHoliday(dt)) {
        fLogger.info("It's a holiday!");
        return [];
    }
    const candidates = [];
    for (const courseId of Object.keys(schedules)) {
        const course = await dataloader_1.catalogStore.getCourseById(courseId);
        for (const schedule of schedules[courseId]) {
            if (!isRightWeek(schedule, dt)) {
                continue;
            }
            fLogger.info('%s is planned at %s', courseId, dt.toFormat('ff'));
            candidates.push(buildClass(dt.set({
                hour: schedule.hour,
                minute: schedule.minute,
                second: 0,
                millisecond: 0
            }), course));
        }
    }
    if (candidates.length === 0) {
        fLogger.info('no class planned today');
    }
    return candidates;
}
exports.getPreschedules = getPreschedules;
function buildClass(ts, course, isCamp = false) {
    const klass = new cl_models_1.ClassModel({ courseId: course.id }, { include: [cl_models_1.SessionModel] });
    if (course.isRegular) {
        const sessions = isCamp
            ? createCampSchedules(ts, klass, course)
            : createWeeklySchedules(ts, klass, course);
        klass.set('startDate', sessions[0].startDate);
        klass.set('endDate', sessions[exports.regularClassLength - 1].endDate);
        klass.set('sessions', sessions);
    }
    else {
        const session = new cl_models_1.SessionModel({
            idx: 0,
            classId: klass.id,
            startDate: ts.toJSDate(),
            endDate: ts.plus({ minutes: course.duration }).toJSDate()
        });
        klass.set('startDate', session.startDate);
        klass.set('endDate', session.endDate);
        klass.set('sessions', [session]);
    }
    return klass;
}
exports.buildClass = buildClass;
// 4 patterns:  Mon/Thur, Tue/Friday, Wed/Sat, Wed/Sun
const patterns = [
    [3, 4, 3],
    [3, 4, 3],
    [3, 4, 3],
    [3, 4, 3],
    [4, 3, 4],
    [4, 3, 4],
    [4, 3, 4],
    [4, 3, 4]
];
function createCampSchedules(ts, klass, course) {
    const intervals = patterns[ts.toJSDate().getDay()];
    const sessions = [];
    for (let idx = 0; idx < exports.regularClassLength; idx++) {
        sessions.push(new cl_models_1.SessionModel({
            idx,
            classId: klass.id,
            startDate: ts.toJSDate(),
            endDate: ts.plus({ minutes: course.duration }).toJSDate()
        }));
        if (patterns[idx]) {
            ts = ts.plus({ days: intervals[idx] });
        }
    }
    return sessions;
}
function createWeeklySchedules(ts, klass, course) {
    const sessions = [];
    for (let idx = 0; idx < exports.regularClassLength; idx++) {
        sessions.push(new cl_models_1.SessionModel({
            idx,
            classId: klass.id,
            startDate: ts.toJSDate(),
            endDate: ts.plus({ minutes: course.duration }).toJSDate()
        }));
        ts = getNextWeek(ts);
    }
    return sessions;
}
