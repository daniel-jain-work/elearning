"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.addComment = exports.deleteThread = exports.addThread = void 0;
const cl_models_1 = require("cl-models");
const nanoid_1 = require("nanoid");
const xss_1 = require("xss");
const s3_utils_1 = require("../../lib/s3-utils");
async function addThread(root, args, ctx) {
    ctx.onwerOrAdmin(args.teacherId);
    const details = {
        content: xss_1.filterXSS(args.content),
        attachments: []
    };
    if (args.attachments) {
        const uploads = await Promise.all(args.attachments.map(attachment => s3_utils_1.uploadClassroomFile(args.classId + '/' + attachment.name + nanoid_1.nanoid(4), attachment.content)));
        details.attachments = uploads.map(result => result.resultURL);
    }
    const thread = await cl_models_1.ThreadModel.create({
        classId: args.classId,
        teacherId: args.teacherId,
        details
    });
    thread.teacher = await cl_models_1.TeacherModel.findByPk(ctx.teacherId);
    ctx.logger.info({ classId: thread.classId, threadId: thread.id, teacherId: thread.teacherId }, 'started a thread');
    return thread;
}
exports.addThread = addThread;
async function deleteThread(root, args, ctx) {
    const thread = await cl_models_1.ThreadModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    ctx.ownerOrInternal(thread.teacherId);
    ctx.logger.info({ classId: thread.classId, threadId: thread.id, teacherId: thread.teacherId }, 'deleted a thread');
    await thread.destroy();
    return true;
}
exports.deleteThread = deleteThread;
async function addComment(root, args, ctx) {
    ctx.onwerOrAdmin(args.teacherId);
    const comment = await cl_models_1.CommentModel.create(args);
    comment.teacher = await cl_models_1.TeacherModel.findByPk(ctx.teacherId);
    ctx.logger.info({ threadId: comment.threadId, teacherId: comment.teacherId }, 'added a comment');
    return comment;
}
exports.addComment = addComment;
async function deleteComment(root, args, ctx) {
    const comment = await cl_models_1.CommentModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    ctx.ownerOrInternal(comment.teacherId);
    ctx.logger.info({ threadId: comment.threadId, teacherId: comment.teacherId }, 'deleted a comment');
    await comment.destroy();
    return true;
}
exports.deleteComment = deleteComment;
