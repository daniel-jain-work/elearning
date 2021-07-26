"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCourse = exports.createCourse = void 0;
const cl_models_1 = require("cl-models");
const dataloader_1 = require("../../lib/dataloader");
async function createCourse(_, args, ctx) {
    ctx.adminOnly();
    const subject = await dataloader_1.catalogStore.getSubjectById(args.subjectId);
    const course = new cl_models_1.CourseModel({
        id: args.id,
        subjectId: args.subjectId,
        details: {
            official: subject.official
        }
    });
    await updateCourseAttributes(course, args, ctx);
    return course;
}
exports.createCourse = createCourse;
async function updateCourse(_, args, ctx) {
    ctx.adminOnly();
    const course = await cl_models_1.CourseModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    await updateCourseAttributes(course, args, ctx);
    return course;
}
exports.updateCourse = updateCourse;
async function updateCourseAttributes(course, attrs, ctx) {
    if (attrs.grades && attrs.grades.length !== 2) {
        ctx.badRequest('grades needs to have both lower and upper bound');
    }
    const { name, level, ...details } = attrs;
    if (name) {
        course.set('name', name);
    }
    if (typeof level === 'number') {
        course.set('level', level);
    }
    course.set('details', {
        ...course.details,
        ...details
    });
    await course.save();
    ctx.logger.info({ payload: attrs, courseId: course.id }, 'course %s is updated ', course.name);
    dataloader_1.catalogStore.reset();
}
