"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitBlogUpdatedEvent = exports.emitClassEnrolledEvent = exports.emitClassUpdatedEvent = exports.emitClassCreatedEvent = exports.writeCloudwatchEvents = exports.writeCloudwatchEvent = void 0;
const aws_sdk_1 = require("aws-sdk");
const config = require("config");
const logger_1 = require("./logger");
const env = config.util.getEnv('NODE_ENV');
const cloudWatchSource = 'api.' + env;
const cloudWatchEvents = new aws_sdk_1.CloudWatchEvents({
    apiVersion: '2015-10-07'
});
const toEntry = (evt) => ({
    DetailType: evt.type,
    Detail: JSON.stringify(evt.payload),
    Source: cloudWatchSource
});
async function writeCloudwatchEvent(evt) {
    try {
        await cloudWatchEvents
            .putEvents({
            Entries: [toEntry(evt)]
        })
            .promise();
    }
    catch (err) {
        logger_1.default.error(err, 'fail to emit cloudwatch events');
    }
}
exports.writeCloudwatchEvent = writeCloudwatchEvent;
async function writeCloudwatchEvents(events) {
    try {
        await cloudWatchEvents
            .putEvents({
            Entries: events.map(toEntry).slice(0, 10)
        })
            .promise();
    }
    catch (err) {
        logger_1.default.error(err, 'fail to emit cloudwatch events');
    }
}
exports.writeCloudwatchEvents = writeCloudwatchEvents;
exports.emitClassCreatedEvent = (payload) => writeCloudwatchEvent({
    type: 'CLASS_CREATED',
    payload
});
exports.emitClassUpdatedEvent = (payload) => writeCloudwatchEvent({
    type: 'CLASS_UPDATED',
    payload
});
exports.emitClassEnrolledEvent = (payload) => writeCloudwatchEvent({
    type: 'CLASS_ENROLLED',
    payload
});
exports.emitBlogUpdatedEvent = (payload) => writeCloudwatchEvent({
    type: 'BLOG_UPDATED',
    payload
});
