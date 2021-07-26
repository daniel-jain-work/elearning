"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMeetingDetails = exports.getMeetingRecordings = exports.deleteMeeting = exports.updateMeeting = exports.createMeeting = exports.getMeeting = exports.signAccessToken = void 0;
const Sentry = require("@sentry/node");
const bottleneck_1 = require("bottleneck");
const cl_common_1 = require("cl-common");
const config = require("config");
const gaxios_1 = require("gaxios");
const jwt = require("jsonwebtoken");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const nanoid_1 = require("nanoid");
const google_calendar_1 = require("../lib/google-calendar");
const apiKey = config.get('zoom.api.key');
const apiSecret = config.get('zoom.api.secret');
const rateLimiter = new bottleneck_1.default({
    minTime: 250,
    maxConcurrent: 2
});
exports.signAccessToken = () => jwt.sign({
    iss: apiKey,
    exp: Date.now() + 60 * 1000
}, apiSecret, { algorithm: 'HS256' });
async function zoomRequest(cfg = {}) {
    return rateLimiter.schedule(() => gaxios_1.request({
        baseURL: 'https://api.zoom.us/v2',
        timeout: 5000,
        ...cfg,
        headers: {
            Authorization: 'Bearer ' + exports.signAccessToken()
        }
    }));
}
async function getMeeting(zoomId, logger) {
    try {
        const res = await zoomRequest({
            url: `/meetings/${zoomId}`,
            retry: true
        });
        return {
            id: res.data.id,
            hostId: res.data.host_id,
            joinUrl: res.data.join_url,
            startUrl: res.data.start_url
        };
    }
    catch (err) {
        logger.error(err, 'fail to fetch zoom meeting');
        Sentry.captureException(err);
    }
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
        data: buildMeetingDetails(klass, course, nanoid_1.nanoid(6))
    });
    const details = {
        ...klass.details,
        password: data.password,
        dialInLink: data.join_url,
        zoomId: data.id.toString()
    };
    if (data.encrypted_password &&
        !details.dialInLink.includes(data.encrypted_password)) {
        details.dialInLink = data.join_url + '?pwd=' + data.encrypted_password;
    }
    await klass.update({
        zoomhostId: selectedHost.id,
        details
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
        data: buildMeetingDetails(klass, course, klass.password)
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
async function getMeetingRecordings(zoomId, logger) {
    try {
        const settings = await zoomRequest({
            url: `/meetings/${zoomId}/recordings/settings`,
            method: 'GET'
        });
        const recordings = await zoomRequest({
            url: `/meetings/${zoomId}/recordings`,
            method: 'GET'
        });
        return recordings.data.recording_files
            .filter(file => file.status === 'completed')
            .map(file => ({
            id: file.id,
            downloadUrl: file.download_url,
            playUrl: file.play_url,
            start: file.recording_start,
            end: file.recording_end,
            password: settings.data.password
        }));
    }
    catch (err) {
        if (err.code !== '404') {
            logger.error(err, 'fail to fetch meeting recordings');
            Sentry.captureException(err);
        }
    }
    return [];
}
exports.getMeetingRecordings = getMeetingRecordings;
// https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
function buildMeetingDetails(klass, course, password) {
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
            auto_recording: 'cloud',
            waiting_room: false
        }
    };
    if (klass.zoomId) {
        details.id = klass.zoomId;
    }
    if (klass.zoomhostId) {
        details.host_id = klass.zoomhostId;
    }
    if (password) {
        details.password = password;
    }
    return details;
}
exports.buildMeetingDetails = buildMeetingDetails;
