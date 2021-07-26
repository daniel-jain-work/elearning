"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTemplatedEmail = exports.sendEmail = exports.MrNewsman = exports.MrScheduler = exports.MrCTO = exports.MsOps = exports.ClassMaster = void 0;
const Sentry = require("@sentry/node");
const aws_sdk_1 = require("aws-sdk");
const config = require("config");
const logger_1 = require("./logger");
const sendgrid_1 = require("./sendgrid");
// SES email
const ses = new aws_sdk_1.SES(config.get('ses'));
const prefix = config.util.getEnv('NODE_ENV') === 'production' ? 'Create & Learn' : 'API';
const sourceEmail = config.get('email.source');
const defaultEmail = config.get('email.classes');
exports.ClassMaster = `${prefix} <${defaultEmail}>`;
exports.MsOps = `Amy (${prefix}) <${config.get('email.ops')}>`;
exports.MrCTO = `${prefix} <${config.get('email.cto')}>`;
exports.MrScheduler = `Mr. Scheduler <${defaultEmail}>`;
exports.MrNewsman = `Mr. Newsman <${defaultEmail}>`;
exports.sendEmail = (Destination, Message) => ses
    .sendEmail({ Destination, Message, Source: `${prefix} <${sourceEmail}>` })
    .promise()
    .catch(err => {
    logger_1.default.error(err, 'fail to email %s to %o', Message.Subject.Data);
    Sentry.captureException(err);
});
async function sendTemplatedEmail(opts, ga) {
    try {
        logger_1.default.debug(opts, 'sendTemplatedEmail %s', opts.templateId);
        await sendgrid_1.sendgridSend(opts, ga);
    }
    catch (err) {
        Sentry.withScope(scope => {
            scope.setTag('service', 'sendgrid');
            scope.setExtras(opts);
            Sentry.captureException(err);
        });
        logger_1.default.error({ err }, 'fail to send email');
    }
}
exports.sendTemplatedEmail = sendTemplatedEmail;
