"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmailTemplate = exports.removeEmailTemplate = void 0;
const cl_models_1 = require("cl-models");
async function removeEmailTemplate(root, args, ctx) {
    const emailTemplate = await cl_models_1.UserEmailTemplateModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    if (emailTemplate.teacherId) {
        ctx.onwerOrAdmin(emailTemplate.teacherId);
    }
    else {
        ctx.adminOnly();
    }
    await emailTemplate.destroy();
    return true;
}
exports.removeEmailTemplate = removeEmailTemplate;
async function updateEmailTemplate(root, args, ctx) {
    if ('teacherId' in args) {
        ctx.onwerOrAdmin(args.teacherId);
    }
    else {
        ctx.internalOnly();
    }
    let tpl;
    if (args.id) {
        tpl = await cl_models_1.UserEmailTemplateModel.findByPk(args.id);
    }
    else {
        tpl = new cl_models_1.UserEmailTemplateModel();
    }
    tpl.set('name', args.name);
    tpl.set('details', {
        html: args.html,
        subject: args.subject
    });
    if (args.teacherId)
        tpl.set('teacherId', args.teacherId);
    if (args.subjectId)
        tpl.set('subjectId', args.subjectId);
    if (args.isCommon)
        tpl.set('isCommon', args.isCommon);
    return tpl.save();
}
exports.updateEmailTemplate = updateEmailTemplate;
