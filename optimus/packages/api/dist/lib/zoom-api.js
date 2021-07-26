"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bottleneck_1 = require("bottleneck");
const cl_common_1 = require("cl-common");
const config = require("config");
const gaxios_1 = require("gaxios");
const jwt = require("jsonwebtoken");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const google_calendar_1 = require("./google-calendar");
const apiKey = config.get('zoom.api.key');
const apiSecret = config.get('zoom.api.secret');
const rateLimiter = new bottleneck_1.default({
    minTime: 250,
    maxConcurrent: 4
});
exports.signAccessToken = () => jwt.sign({
    iss: apiKey,
    exp: Date.now() + 60 * 1000
}, apiSecret, { algorithm: 'HS256' });
async function zoomRequest(cfg = {}) {
    return rateLimiter.schedule(() => gaxios_1.request({
        baseURL: 'https://api.zoom.us/v2',
        timeout: 4000,
        ...cfg,
        headers: {
            Authorization: 'Bearer ' + exports.signAccessToken()
        }
    }));
}
async function getMeeting(zoomId) {
    const { data } = await zoomRequest({ url: `/meetings/${zoomId}` });
    return {
        id: data.id,
        hostId: data.host_id,
        joinUrl: data.join_url,
        startUrl: data.start_url
    };
}
exports.getMeeting = getMeeting;
async function createMeeting(klass, course, logger) {
    const availableHosts = await google_calendar_1.getAvailableResources(klass);
    if (availableHosts.length === 0) {
        return;
    }
    const selectedHost = lodash_1.sample(availableHosts);
    logger.info('find %s available for this class', selectedHost.name);
    const { data } = await zoomRequest({
        url: `/users/${selectedHost.id}/meetings`,
        method: 'POST',
        data: buildMeetingDetails(klass, course)
    });
    await klass.update({
        zoomhostId: selectedHost.id,
        details: {
            ...klass.details,
            dialInLink: data.join_url,
            zoomId: data.id.toString()
        }
    });
    klass.zoomhost = selectedHost;
    logger.info({ zoomId: data.id }, 'zoom meeting created %o', data);
    return data;
}
exports.createMeeting = createMeeting;
async function updateMeeting(klass, course, logger) {
    if (!klass.zoomId) {
        return;
    }
    await zoomRequest({
        url: `/meetings/${klass.zoomId}`,
        method: 'PATCH',
        data: buildMeetingDetails(klass, course)
    });
    logger.info({ zoomId: klass.zoomId }, 'zoom meeting updated');
}
exports.updateMeeting = updateMeeting;
async function deleteMeeting(klass, logger) {
    if (!klass.zoomId) {
        return;
    }
    await zoomRequest({ url: `/meetings/${klass.zoomId}`, method: 'DELETE' });
    logger.info({ zoomId: klass.zoomId }, 'zoom meeting deleted');
}
exports.deleteMeeting = deleteMeeting;
async function getMeetingRecordings(zoomId) {
    const result = await zoomRequest({
        url: `/meetings/${zoomId}/recordings`,
        method: 'GET'
    });
    return result.data.recording_files.filter(file => file.status === 'completed');
}
exports.getMeetingRecordings = getMeetingRecordings;
async function getAccountRecordings(from, to) {
    const result = await zoomRequest({
        url: '/accounts/me/recordings',
        method: 'GET',
        params: {
            from: from.toISO({ suppressMilliseconds: true, includeOffset: false }),
            to: to.toISO({ suppressMilliseconds: true, includeOffset: false })
        }
    });
    return result.data.meetings;
}
exports.getAccountRecordings = getAccountRecordings;
function buildMeetingDetails(klass, course) {
    const dts = luxon_1.DateTime.fromJSDate(klass.startDate, cl_common_1.tzOpts);
    let type = 2;
    let topic = course.name;
    if (course.isTrial) {
        topic += dts.toFormat(' (ffff)');
    }
    else if (course.isRegular) {
        type = 3;
        const dates = klass.schedules
            .map(schedule => luxon_1.DateTime.fromJSDate(schedule[0], cl_common_1.tzOpts).toFormat('L/dd'))
            .join(', ');
        topic += ` (${dts.toFormat('t')} ${dts.offsetNameLong}, ${dates})`;
    }
    const details = {
        topic,
        type,
        agenda: course.description,
        start_time: dts.toISO({ suppressMilliseconds: true, includeOffset: false }),
        timezone: cl_common_1.defaultTimezone,
        duration: course.duration,
        settings: {
            mute_upon_entry: true,
            auto_recording: 'cloud'
        }
    };
    if (klass.zoomId) {
        details.id = klass.zoomId;
    }
    if (klass.zoomhostId) {
        details.host_id = klass.zoomhostId;
    }
    return details;
}
exports.buildMeetingDetails = buildMeetingDetails;
