"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = void 0;
const cl_models_1 = require("cl-models");
const config = require("config");
const luxon_1 = require("luxon");
const cloudwatch_1 = require("../lib/cloudwatch");
const logger_1 = require("../lib/logger");
const zoom_api_1 = require("./zoom-api");
const zoomEvents = new Map([
    ['meeting.participant_joined', cl_models_1.ClassActivityType.ParticipantJoined],
    ['meeting.participant_left', cl_models_1.ClassActivityType.ParticipantLeft],
    ['meeting.started', cl_models_1.ClassActivityType.MeetingStarted],
    ['meeting.ended', cl_models_1.ClassActivityType.MeetingEnded],
    ['meeting.sharing_started', cl_models_1.ClassActivityType.MeetingSharingStarted],
    ['meeting.sharing_ended', cl_models_1.ClassActivityType.MeetingSharingEnded]
]);
const webhookToken = config.get('zoom.webhooks.token');
async function handleWebhook(headers, eventBody) {
    var _a, _b, _c, _d, _e, _f;
    if (headers['Authorization'] !== webhookToken) {
        return {
            body: 'unauthorized',
            statusCode: 401
        };
    }
    const { payload, event } = JSON.parse(eventBody);
    // work around zoom bug that sends id as integer from time to time
    const meetingId = '' + payload.object.id;
    const fLogger = logger_1.default.child({ event, meetingId });
    const klass = await cl_models_1.ClassModel.findOne({
        where: {
            'details.zoomId': meetingId
        }
    });
    if (!klass) {
        fLogger.error({ payload }, 'cannot find zoom meeting for the class');
        return;
    }
    if (event === 'recording.completed') {
        if (((_a = payload.object) === null || _a === void 0 ? void 0 : _a.recording_files.length) > 0) {
            const accessToken = zoom_api_1.signAccessToken();
            const events = payload.object.recording_files.map(file => ({
                type: 'DOWNLOAD_RECORDING',
                payload: {
                    classId: klass.id,
                    timestamp: new Date(file.recording_start).getTime(),
                    fileType: file.file_type,
                    recordingType: file.recording_type,
                    downloadUrl: file.download_url + '?access_token=' + accessToken
                }
            }));
            fLogger.info({ classId: klass.id, files: payload.object.recording_files }, 'recordings ready');
            await cloudwatch_1.writeCloudwatchEvents(events);
        }
        return;
    }
    const activityType = zoomEvents.get(event);
    if (!activityType) {
        fLogger.error('unsupported event %s', event);
        return;
    }
    if (payload.object.participant) {
        if (payload.object.host_id === payload.object.participant.id) {
            payload.object.participant.user_name = 'Meeting Host';
        }
        else if (((_b = payload.object.participant.user_name) === null || _b === void 0 ? void 0 : _b.length) > 50) {
            // https://devforum.zoom.us/t/invalid-characters-in-user-name-when-receiving-event-notifications/6123/9
            // there is a zoom bug that returns werid character in webhook event, drop those for now
            fLogger.warn('bad user name %s', payload.object.participant.user_name);
            return;
        }
    }
    let eventTime;
    switch (activityType) {
        case cl_models_1.ClassActivityType.ParticipantJoined:
            if ((_c = payload.object.participant) === null || _c === void 0 ? void 0 : _c.join_time) {
                eventTime = luxon_1.DateTime.fromISO(payload.object.participant.join_time, {
                    zone: payload.object.timezone
                });
            }
            break;
        case cl_models_1.ClassActivityType.ParticipantLeft:
            if ((_d = payload.object.participant) === null || _d === void 0 ? void 0 : _d.leave_time) {
                eventTime = luxon_1.DateTime.fromISO(payload.object.participant.leave_time, {
                    zone: payload.object.timezone
                });
            }
            break;
        case cl_models_1.ClassActivityType.MeetingStarted:
            if (payload.object.start_time) {
                eventTime = luxon_1.DateTime.fromISO(payload.object.start_time, {
                    zone: payload.object.timezone
                });
            }
            break;
        case cl_models_1.ClassActivityType.MeetingEnded:
            if (payload.object.end_time) {
                eventTime = luxon_1.DateTime.fromISO(payload.object.end_time, {
                    zone: payload.object.timezone
                });
            }
            break;
        case cl_models_1.ClassActivityType.MeetingSharingStarted:
            if ((_e = payload.object.participant) === null || _e === void 0 ? void 0 : _e.sharing_details) {
                eventTime = luxon_1.DateTime.fromISO(payload.object.participant.sharing_details.date_time, { zone: payload.object.timezone });
            }
            break;
        case cl_models_1.ClassActivityType.MeetingSharingEnded:
            if ((_f = payload.object.participant) === null || _f === void 0 ? void 0 : _f.sharing_details) {
                eventTime = luxon_1.DateTime.fromISO(payload.object.participant.sharing_details.date_time, { zone: payload.object.timezone });
            }
            break;
    }
    if (!eventTime) {
        eventTime = luxon_1.DateTime.local();
    }
    const session = klass.sessions.find(ses => {
        if (ses.startDate > eventTime.plus({ minutes: 45 }).toJSDate()) {
            return false;
        }
        if (ses.endDate < eventTime.minus({ minutes: 45 }).toJSDate()) {
            return false;
        }
        return true;
    });
    if (!session) {
        fLogger.warn('event %s happens at %s, way out of class time', event, eventTime.toFormat('fff'));
        return;
    }
    fLogger.info({ classId: klass.id }, 'webhook event %s recorded for session %d', event, session.idx + 1);
    const ts = eventTime.toJSDate();
    await cl_models_1.ClassActivityLogModel.findOrCreate({
        where: {
            sessionId: session.id,
            type: activityType,
            createdAt: ts
        },
        defaults: {
            sessionId: session.id,
            type: activityType,
            details: payload.object,
            createdAt: ts,
            updatedAt: ts
        }
    });
    return {
        body: 'ok',
        statusCode: 200
    };
}
exports.handleWebhook = handleWebhook;
