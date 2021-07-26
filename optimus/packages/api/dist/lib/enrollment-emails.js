"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRegistrationConfirmation = exports.sendRescheduleConfirmation = exports.sendAddonConfirmation = void 0;
const cl_common_1 = require("cl-common");
const luxon_1 = require("luxon");
const invoice_tpl_1 = require("./invoice-tpl");
const mailer_1 = require("./mailer");
const mailer_utils_1 = require("./mailer-utils");
async function sendAddonConfirmation(student, klass, course, idx) {
    const tzOpts = { zone: student.parent.timezone };
    await mailer_1.sendTemplatedEmail({
        templateId: 'd-19a8d14657864654aebe81a6648ed41f',
        from: mailer_1.ClassMaster,
        to: mailer_utils_1.createRecipient(student.parent),
        asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
        category: 'confirmation',
        customArgs: {
            amp_user_id: student.parentId
        },
        dynamicTemplateData: {
            ...mailer_utils_1.createClassParams(klass, course),
            ...mailer_utils_1.createStudentParams(student),
            session: idx + 1,
            classTime: luxon_1.DateTime.fromJSDate(klass.schedules[idx][0], tzOpts).toFormat('ffff')
        }
    });
}
exports.sendAddonConfirmation = sendAddonConfirmation;
async function sendRescheduleConfirmation(student, klass, course) {
    const tzOpts = { zone: student.parent.timezone };
    await mailer_1.sendTemplatedEmail({
        templateId: 'd-26875caca1f34e4891170dddeff1e269',
        from: mailer_1.ClassMaster,
        to: mailer_utils_1.createRecipient(student.parent),
        asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
        category: 'confirmation',
        customArgs: {
            amp_user_id: student.parentId
        },
        dynamicTemplateData: {
            ...mailer_utils_1.createClassParams(klass, course),
            ...mailer_utils_1.createStudentParams(student),
            classTime: luxon_1.DateTime.fromJSDate(klass.startDate, tzOpts).toFormat('t ZZZZZ'),
            classDates: klass.schedules
                .map(schedule => luxon_1.DateTime.fromJSDate(schedule[0], tzOpts).toFormat('LLL d'))
                .join(', ')
        }
    });
}
exports.sendRescheduleConfirmation = sendRescheduleConfirmation;
async function sendRegistrationConfirmation(student, klass, course, transaction) {
    const tzOpts = { zone: student.parent.timezone };
    const startTime = luxon_1.DateTime.fromJSDate(klass.startDate, tzOpts);
    if (course.isRegular) {
        const attachments = [];
        if (transaction) {
            const invoiceHtml = await invoice_tpl_1.createInvoice(student, transaction);
            const invoiceContent = Buffer.from(invoiceHtml, 'utf-8');
            attachments.push({
                content: invoiceContent.toString('base64'),
                filename: 'receipt.html'
            });
        }
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-396838b0f3cc4d72b3648903f00a577b',
            from: mailer_1.ClassMaster,
            to: mailer_utils_1.createRecipient(student.parent),
            attachments,
            customArgs: {
                amp_user_id: student.parentId
            },
            dynamicTemplateData: {
                ...mailer_utils_1.createClassParams(klass, course),
                ...mailer_utils_1.createStudentParams(student),
                classTime: startTime.toFormat('t ZZZZZ'),
                classDates: klass.schedules
                    .map(schedule => luxon_1.DateTime.fromJSDate(schedule[0], tzOpts).toFormat('LLL d'))
                    .join(', ')
            }
        });
    }
    else {
        await mailer_1.sendTemplatedEmail({
            templateId: 'd-76e26f7b26434284b0498d2a52dac909',
            from: mailer_1.ClassMaster,
            to: mailer_utils_1.createRecipient(student.parent),
            customArgs: {
                amp_user_id: student.parentId
            },
            dynamicTemplateData: {
                classTime: startTime.toFormat('ffff'),
                ...mailer_utils_1.createClassParams(klass, course),
                ...mailer_utils_1.createStudentParams(student)
            }
        });
    }
}
exports.sendRegistrationConfirmation = sendRegistrationConfirmation;
