"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendgridSend = void 0;
const mail_1 = require("@sendgrid/mail");
const config = require("config");
// sendgrid
const options = config.get('sendgrid');
mail_1.setApiKey(options.apiKey);
async function sendgridSend(data, ga) {
    if (options.sandbox) {
        data.mailSettings = {
            sandboxMode: { enable: true }
        };
    }
    else if (ga) {
        data.trackingSettings = {
            ganalytics: {
                enable: true,
                utmCampaign: ga.campaign,
                utmSource: ga.source,
                utmMedium: 'email'
            }
        };
    }
    return mail_1.send(data);
}
exports.sendgridSend = sendgridSend;
