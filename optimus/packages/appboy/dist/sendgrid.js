"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendgridSend = void 0;
const mail_1 = require("@sendgrid/mail");
const Sentry = require("@sentry/node");
const bottleneck_1 = require("bottleneck");
const config = require("config");
const apiKey = config.get('sendgrid.apiKey');
const sandbox = config.get('sendgrid.sandbox');
mail_1.setApiKey(apiKey);
const rateLimiter = new bottleneck_1.default({
    minTime: 250,
    maxConcurrent: 1
});
async function sendgridSend(data, logger, ga) {
    if (sandbox) {
        return mail_1.send({
            ...data,
            mailSettings: {
                sandboxMode: { enable: true }
            }
        });
    }
    if (ga) {
        data.trackingSettings = {
            ganalytics: {
                enable: true,
                utmCampaign: ga.campaign,
                utmSource: ga.source,
                utmMedium: 'email'
            }
        };
    }
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
exports.sendgridSend = sendgridSend;
