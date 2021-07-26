"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.track = void 0;
const config = require("config");
const gaxios_1 = require("gaxios");
const opts = config.get('segment');
const authKey = Buffer.from(opts.key + ':').toString('base64');
async function track(user, data, fLogger) {
    const payload = {
        ...data,
        userId: user.id,
        context: {
            timezone: user.timezone,
            address: {
                city: user.city,
                country: user.country
            },
            traits: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        }
    };
    if (opts.enabled) {
        await gaxios_1.request({
            url: 'https://api.segment.io/v1/track',
            timeout: 5000,
            method: 'POST',
            retry: true,
            data: payload,
            headers: {
                Authorization: `Basic ${authKey}`
            }
        });
    }
    fLogger.info(payload, 'segment.track');
}
exports.track = track;
