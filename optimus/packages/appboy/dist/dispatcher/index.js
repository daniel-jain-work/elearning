"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const Sentry = require("@sentry/node");
const config = require("config");
const logger_1 = require("../logger");
const account_created_1 = require("./account-created");
const api_client_1 = require("./api-client");
const class_enrolled_1 = require("./class-enrolled");
const class_update_handler_1 = require("./class-update-handler");
const zoomtopia_1 = require("./zoomtopia");
async function handleCloudwatchEvent(type, payload) {
    logger_1.default.info(payload, 'receive %s event', type);
    switch (type) {
        case 'DOWNLOAD_RECORDING':
            await zoomtopia_1.downloadZoomRecording(payload, logger_1.default.child({ event: type, classId: payload.classId }));
            break;
        case 'ACCOUNT_CREATED':
            await account_created_1.handleAccountCreated(payload, logger_1.default.child({ event: type, userId: payload.id }));
            break;
        case 'CLASS_CREATED':
            await class_update_handler_1.handleClassCreated(payload, logger_1.default.child({ event: type, classId: payload.classId }));
            break;
        case 'CLASS_UPDATED':
            await class_update_handler_1.handleClassUpdated(payload, logger_1.default.child({ event: type, classId: payload.classId }));
            break;
        case 'CLASS_ENROLLED':
            await class_enrolled_1.handleClassEnrolled(payload, logger_1.default.child({
                event: type,
                enrollmentId: payload.id,
                classId: payload.classId
            }));
            break;
    }
}
async function handler(event) {
    Sentry.init(config.get('sentry'));
    try {
        if (event['detail-type']) {
            await handleCloudwatchEvent(event['detail-type'], event.detail);
        }
        if (event.type) {
            await api_client_1.runCronJob(event);
        }
    }
    catch (err) {
        logger_1.default.error(err, 'fail to handle webhook event');
        Sentry.withScope(scope => {
            scope.setTag('service', 'dispatcher');
            scope.setExtra('event', event);
            Sentry.captureException(err);
        });
        throw err;
    }
}
exports.handler = handler;
