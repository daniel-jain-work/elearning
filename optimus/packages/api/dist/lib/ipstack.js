"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoTagUser = void 0;
const config = require("config");
const gaxios_1 = require("gaxios");
const accessKey = config.get('ipstack.key');
async function geoTagUser(user, fLogger) {
    if (!user.clientIp) {
        return;
    }
    try {
        const result = await gaxios_1.request({
            url: `http://api.ipstack.com/` + user.clientIp,
            timeout: 5000,
            params: {
                access_key: accessKey
            }
        });
        fLogger.info({ result: result.data }, 'reverse geocode %s', user.clientIp);
        await user.setDetails({
            country: result.data.country_name,
            state: result.data.region_code,
            city: result.data.city
        });
    }
    catch (err) {
        fLogger.error(err, 'reverse geocode failed for %s', user.email);
    }
}
exports.geoTagUser = geoTagUser;
