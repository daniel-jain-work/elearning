"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFollowupEmail = exports.sendClassConfirmationEmail = void 0;
const cl_models_1 = require("cl-models");
const dataUrls = require("data-urls");
const dataloader_1 = require("../../lib/dataloader");
const enrollment_emails_1 = require("../../lib/enrollment-emails");
const mailer_1 = require("../../lib/mailer");
const mailer_utils_1 = require("../../lib/mailer-utils");
const sendgrid_1 = require("../../lib/sendgrid");
async function sendClassConfirmationEmail(_, args, ctx) {
    const er = await cl_models_1.EnrollmentModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.ClassModel, { model: cl_models_1.StudentModel, required: true }, cl_models_1.TransactionModel]
    });
    const course = await dataloader_1.catalogStore.getCourseById(er.class.courseId);
    const sale = er.transactions.find(t => t.type === cl_models_1.TransactionOperation.Sale);
    if (args.isReschedule) {
        await enrollment_emails_1.sendRescheduleConfirmation(er.student, er.class, course);
        ctx.logger.info({ classId: er.classId, userId: er.student.parentId }, 'send %s reschedule confirmation email to %s', course.name, er.student.parent.email);
    }
    else {
        await enrollment_emails_1.sendRegistrationConfirmation(er.student, er.class, course, sale);
        ctx.logger.info({ classId: er.classId, userId: er.student.parentId }, 'send %s confirmation email to %s', course.name, er.student.parent.email);
    }
    return true;
}
exports.sendClassConfirmationEmail = sendClassConfirmationEmail;
async function sendFollowupEmail(_, args, ctx) {
    const klass = await cl_models_1.ClassModel.findByPk(args.classId, {
        rejectOnEmpty: true,
        include: [cl_models_1.TeacherModel]
    });
    ctx.ownerOrInternal(klass.teacherId);
    let data;
    if (args.studentId) {
        const student = await cl_models_1.StudentModel.findByPk(args.studentId, {
            rejectOnEmpty: true
        });
        data = getMailData(args, klass.teacher);
        data.to = mailer_utils_1.createRecipient(student.parent);
        data.customArgs = {
            amp_user_id: student.parentId
        };
    }
    else {
        const students = await klass.getStudents();
        if (students.length === 0) {
            return;
        }
        data = getMailData(args);
        data.to = mailer_1.MsOps;
        data.bcc = students.map(student => student.parent.email);
    }
    await sendgrid_1.sendgridSend(data);
    return true;
}
exports.sendFollowupEmail = sendFollowupEmail;
function getMailData(args, teacher) {
    const data = {
        from: mailer_1.ClassMaster,
        subject: args.subject,
        html: args.html
    };
    if (args.attachments && args.attachments.length > 0) {
        data.attachments = args.attachments.map(file => {
            const data = dataUrls(file.content).body;
            return {
                content: data.toString('base64'),
                filename: file.name
            };
        });
    }
    if (teacher) {
        data.cc = teacher.email;
        // class teacher sends email
        if (teacher.isInternal) {
            data.from = teacher.email;
        }
        else {
            data.replyTo = teacher.email;
        }
    }
    return data;
}
