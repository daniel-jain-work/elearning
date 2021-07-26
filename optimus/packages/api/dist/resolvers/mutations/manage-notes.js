"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeNote = exports.addNoteToTeacher = exports.addNoteToClass = exports.addNoteToStudent = void 0;
const cl_models_1 = require("cl-models");
async function addNoteToStudent(root, args, ctx) {
    ctx.internalOnly();
    await cl_models_1.NoteModel.create({
        content: args.content,
        studentId: args.studentId
    });
    return cl_models_1.StudentModel.findByPk(args.studentId, {
        include: [cl_models_1.NoteModel]
    });
}
exports.addNoteToStudent = addNoteToStudent;
async function addNoteToClass(root, args, ctx) {
    ctx.internalOnly();
    await cl_models_1.NoteModel.create({
        content: args.content,
        classId: args.classId
    });
    return cl_models_1.ClassModel.findByPk(args.classId, {
        include: [cl_models_1.NoteModel]
    });
}
exports.addNoteToClass = addNoteToClass;
async function addNoteToTeacher(root, args, ctx) {
    ctx.internalOnly();
    await cl_models_1.NoteModel.create({
        content: args.content,
        teacherId: args.teacherId
    });
    return cl_models_1.TeacherModel.findByPk(args.teacherId, {
        include: [cl_models_1.NoteModel]
    });
}
exports.addNoteToTeacher = addNoteToTeacher;
async function removeNote(root, args, ctx) {
    ctx.internalOnly();
    const result = await cl_models_1.NoteModel.destroy({
        where: {
            id: args.id
        }
    });
    return result > 0;
}
exports.removeNote = removeNote;
