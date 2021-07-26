"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTrialToken = exports.calculateWorkingHours = exports.suggestBestFit = exports.getAvailableTeachers = exports.getPotentialTeachers = exports.canYouTeachThisClass = exports.Occupancy = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const schedule_config_1 = require("../inventory/schedule-config");
const sequelize_2 = require("../sequelize");
class Occupancy {
    constructor(teacher) {
        this.teacher = teacher;
        this.tasks = new Set();
        this.blocks = [];
        for (const klass of teacher.classes) {
            this.process(klass);
        }
    }
    process(klass) {
        this.tasks.add(klass.id);
        for (let idx = 0; idx < klass.sessions.length; idx++) {
            this.blocks.push([
                luxon_1.Interval.fromDateTimes(luxon_1.DateTime.fromJSDate(klass.sessions[idx].startDate), luxon_1.DateTime.fromJSDate(klass.sessions[idx].endDate).plus({
                    minutes: cl_common_1.coolDownInterval
                })),
                klass.id
            ]);
        }
    }
    getConflict(klass) {
        for (const ses of klass.sessions) {
            const session = luxon_1.Interval.fromDateTimes(ses.startDate, luxon_1.DateTime.fromJSDate(ses.endDate).plus({ minutes: cl_common_1.coolDownInterval }));
            const block = this.blocks.find(block => block[1] !== klass.id && block[0].overlaps(session));
            if (block) {
                return block[1];
            }
        }
    }
    available(klass) {
        if (!this.teacher.hasTimeForClass(klass)) {
            return false;
        }
        if (this.teacher.courses) {
            if (!this.teacher.courses.find(c => c.id === klass.courseId)) {
                return false;
            }
        }
        return !this.getConflict(klass);
    }
    assignClass(klass) {
        if (!this.tasks.has(klass.id)) {
            this.process(klass);
        }
    }
}
exports.Occupancy = Occupancy;
const findConflictingAssignment = (t, klass) => cl_models_1.SessionModel.findOne({
    where: {
        classId: {
            [sequelize_1.Op.not]: klass.id
        },
        [sequelize_1.Op.or]: klass.sessions.map(ses => ({
            startDate: {
                [sequelize_1.Op.lt]: luxon_1.DateTime.fromJSDate(ses.endDate)
                    .plus({ minutes: cl_common_1.coolDownInterval })
                    .toJSDate()
            },
            endDate: {
                [sequelize_1.Op.gt]: luxon_1.DateTime.fromJSDate(ses.startDate)
                    .minus({ minutes: cl_common_1.coolDownInterval })
                    .toJSDate()
            }
        }))
    },
    include: [
        {
            model: cl_models_1.ClassModel,
            include: [cl_models_1.CourseModel],
            required: true,
            where: {
                teacherId: t.id
            }
        }
    ]
});
async function canYouTeachThisClass(teacher, klass) {
    if (!teacher.hasTimeForClass(klass)) {
        return [false, `The schedule is out of ${teacher.firstName}'s working hours`];
    }
    const skills = teacher.courses ||
        (await teacher.getCourses({
            where: {
                id: klass.courseId
            }
        }));
    if (skills.length === 0) {
        return [false, `${teacher.fullName} has not been approved to teach this class`];
    }
    const ses = await findConflictingAssignment(teacher, klass);
    if (ses) {
        const sessionTime = luxon_1.DateTime.fromJSDate(ses.startDate, cl_common_1.tzOpts).toFormat('fff');
        return [
            false,
            `Conflict with ${ses.class.course.name} (session ${ses.idx + 1}) at ${sessionTime}`
        ];
    }
    return [true, ''];
}
exports.canYouTeachThisClass = canYouTeachThisClass;
exports.getPotentialTeachers = (startDate, endDate, courseId) => cl_models_1.TeacherModel.findAll({
    order: [[cl_models_1.CourseModel, cl_models_1.TeacherCourseModel, 'priority', 'DESC']],
    include: [
        {
            model: cl_models_1.ClassModel,
            required: false,
            where: {
                endDate: { [sequelize_1.Op.gte]: startDate },
                startDate: { [sequelize_1.Op.lte]: endDate }
            }
        },
        courseId
            ? {
                model: cl_models_1.CourseModel,
                required: true,
                where: {
                    id: courseId
                }
            }
            : cl_models_1.CourseModel
    ]
});
async function getAvailableTeachers(klass) {
    const teachers = exports.getPotentialTeachers(klass.startDate, klass.endDate, klass.courseId);
    return teachers.filter(t => {
        const oc = new Occupancy(t);
        return oc.available(klass);
    });
}
exports.getAvailableTeachers = getAvailableTeachers;
async function suggestBestFit(klass, course, fLogger) {
    const candidates = await getAvailableTeachers(klass);
    if (candidates.length === 0) {
        fLogger.info('no teacher available');
        return null;
    }
    fLogger.info(candidates.reduce((all, t) => {
        all[t.fullName] = t.tokens;
        return all;
    }, {}), '%d candidates found for class %s', candidates.length, course.name);
    if (course.isTrial && candidates.length > 1) {
        const pool = [];
        for (const t of candidates) {
            for (let i = 0; i < t.tokens; i++) {
                pool.push(t);
            }
        }
        if (pool.length > 0) {
            // pick a random teacher from all available ones, the one with more token has a better chance
            return lodash_1.sample(pool);
        }
    }
    return candidates[0];
}
exports.suggestBestFit = suggestBestFit;
const earlist = schedule_config_1.shiftConfig.first[0] * 60 + schedule_config_1.shiftConfig.first[1];
const latest = schedule_config_1.shiftConfig.last[0] * 60 + schedule_config_1.shiftConfig.last[1] + 90; // last shift defines the start time of last lass
function calculateWorkingHours(availabilities) {
    const totalMinutes = availabilities.reduce((total, availability) => {
        for (const time of availability.times) {
            const start = Math.max(time[0], earlist);
            const end = Math.min(time[1], latest);
            if (end > start) {
                total += end - start;
            }
        }
        return total;
    }, 0);
    return Math.round(totalMinutes / 60);
}
exports.calculateWorkingHours = calculateWorkingHours;
const rebalanceTokenSql = `
  UPDATE ${cl_models_1.TeacherModel.tableName} t
  INNER JOIN ${cl_models_1.TeacherCourseModel.tableName} tc ON t.id = tc.teacherId
  SET t.tokens = (CASE WHEN (t.tokens + tc.priority) > :max THEN :max  ELSE t.tokens + tc.priority END)
  WHERE tc.courseId = :courseId AND t.deletedAt IS NULL AND t.id != :teacherId
`;
async function useTrialToken(teacher, course, fLogger, opts) {
    if (!course.isTrial) {
        return;
    }
    if (teacher.tokens > 0) {
        fLogger.info({ teacherId: teacher.id }, 'use 1 token out of %d', teacher.tokens);
        await teacher.decrement('tokens', opts);
        return;
    }
    const tc = await cl_models_1.TeacherCourseModel.findOne({
        where: {
            teacherId: teacher.id,
            courseId: course.id
        }
    });
    if (tc) {
        fLogger.info('rebalance everyone else who can teach %s', course.name);
        await sequelize_2.default.query(rebalanceTokenSql, {
            ...opts,
            replacements: {
                max: 10,
                courseId: course.id,
                teacherId: teacher.id
            }
        });
        if (tc.priority > 1) {
            fLogger.info({ teacherId: teacher.id }, 'add %d extra tokens to %s', tc.priority, teacher.fullName);
            await teacher.update({ tokens: tc.priority - 1 }, opts);
        }
    }
}
exports.useTrialToken = useTrialToken;
