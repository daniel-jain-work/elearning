"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTemplatedEmail = exports.MsCEO = exports.MsOps = exports.MrReminder = exports.ClassMaster = exports.defaultEmail = exports.supportEmail = void 0;
const mail_1 = require("@sendgrid/mail");
const Sentry = require("@sentry/node");
const bottleneck_1 = require("bottleneck");
const config = require("config");
const logger_1 = require("./logger");
const prefix = config.util.getEnv('NODE_ENV') === 'production' ? 'Create & Learn' : 'Appboy';
exports.supportEmail = config.get('email.support');
exports.defaultEmail = config.get('email.classes');
exports.ClassMaster = `${prefix} <${config.get('email.classes')}>`;
exports.MrReminder = `${prefix} Reminder <${exports.defaultEmail}>`;
exports.MsOps = config.get('email.ops');
exports.MsCEO = config.get('email.ceo');
mail_1.setApiKey(config.get('sendgrid.apiKey'));
const sandbox = config.get('sendgrid.sandbox');
const batchSize = 750;
const rateLimiter = new bottleneck_1.default({
    minTime: 250,
    maxConcurrent: 1
});
async function sendgridSend(data, logger) {
    try {
        await rateLimiter.schedule(() => mail_1.send(data));
        if (data.personalizations) {
            logger.info('sent email to %d users', data.personalizations.length);
        }
        else {
            logger.info('sent email to %o', data.to);
        }
    }
    catch (err) {
        logger.error(err, 'fail to send templated email');
        Sentry.withScope(scope => {
            scope.setTag('service', 'sendgrid');
            Sentry.captureException(err);
        });
    }
}
async function sendTemplatedEmail(opts, ga) {
    if (sandbox) {
        return mail_1.send({
            ...opts,
            mailSettings: {
                sandboxMode: { enable: true }
            }
        });
    }
    if (ga) {
        opts.trackingSettings = {
            ganalytics: {
                enable: true,
                utmCampaign: ga.campaign,
                utmSource: ga.source,
                utmMedium: 'email'
            }
        };
    }
    const eLogger = logger_1.default.child({
        templateId: opts.templateId,
        category: opts.category
    });
    const { personalizations, ...data } = opts;
    // sendgrid limits to 1000 recipients
    if (!personalizations || personalizations.length <= batchSize) {
        return await sendgridSend(opts, eLogger);
    }
    eLogger.info('send a big batch emails (%d recipients)', personalizations.length);
    const batches = [];
    for (let i = 0; i < personalizations.length / batchSize; i++) {
        const start = i * batchSize;
        batches[i] = {
            ...data,
            personalizations: personalizations.slice(start, start + batchSize)
        };
    }
    await Promise.all(batches.map(batch => sendgridSend(batch, eLogger)));
}
exports.sendTemplatedEmail = sendTemplatedEmail;
