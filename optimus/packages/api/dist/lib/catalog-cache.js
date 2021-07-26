"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCache = exports.getSubjectById = exports.getCourseById = exports.getTrialCourseIds = exports.getRegularCourseIds = void 0;
const cl_models_1 = require("cl-models");
const logger_1 = require("./logger");
const subjectCache = new Map();
const courseCache = new Map();
function getRegularCourseIds() {
    const ids = [];
    for (const course of courseCache.values()) {
        if (course.isRegular) {
            ids.push(course.id);
        }
    }
    return ids;
}
exports.getRegularCourseIds = getRegularCourseIds;
function getTrialCourseIds() {
    const ids = [];
    for (const course of courseCache.values()) {
        if (course.isTrial) {
            ids.push(course.id);
        }
    }
    return ids;
}
exports.getTrialCourseIds = getTrialCourseIds;
function getCourseById(cid) {
    return courseCache.get(cid);
}
exports.getCourseById = getCourseById;
function getSubjectById(sid) {
    return subjectCache.get(sid);
}
exports.getSubjectById = getSubjectById;
let initialized = false;
async function loadCache(force = false) {
    if (initialized && !force) {
        return;
    }
    logger_1.default.info('catelog cache loaded');
    initialized = true;
    const subjects = await cl_models_1.SubjectModel.findAll({
        order: [[cl_models_1.CourseModel, 'level', 'ASC']],
        include: [cl_models_1.CourseModel]
    });
    for (const subject of subjects) {
        subjectCache.set(subject.id, subject);
        for (const course of subject.courses) {
            courseCache.set(course.id, course);
        }
    }
}
exports.loadCache = loadCache;
