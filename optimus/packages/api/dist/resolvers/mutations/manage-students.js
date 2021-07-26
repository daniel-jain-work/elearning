"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editStudentProfile = void 0;
const cl_models_1 = require("cl-models");
async function editStudentProfile(root, args, ctx) {
    const student = await cl_models_1.StudentModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    if (args.name) {
        student.set('name', args.name);
    }
    if (args.gender) {
        student.set('gender', args.gender);
    }
    if (args.year > 0) {
        student.set('year', args.year);
    }
    if (args.school) {
        student.set('details', {
            ...student.details,
            school: args.school
        });
    }
    await student.save();
    ctx.logger.info({ userId: student.parentId }, 'student %s profile updated', student.name);
    return student;
}
exports.editStudentProfile = editStudentProfile;
