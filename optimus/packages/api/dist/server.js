"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const Sentry = require("@sentry/node");
const cl_common_1 = require("cl-common");
const config = require("config");
const graphql_handler_1 = require("./graphql-handler");
const logger_1 = require("./lib/logger");
require("./sequelize");
const zoom_webhooks_1 = require("./zoomtopia/zoom-webhooks");
Sentry.init(config.get('sentry'));
function handler(event, context, cb) {
    if (event.path === '/zoom-webhook') {
        return zoom_webhooks_1.handleWebhook(event.headers, event.body)
            .then(result => cb(null, result))
            .catch(err => {
            logger_1.default.error(err, 'failed to handle zoom webhook event %s', event.body);
            Sentry.withScope(scope => {
                scope.setTag('event', 'zoom-webhook');
                scope.setExtra('payload', event.body);
                Sentry.captureException(err);
                cb(err);
            });
        });
    }
    if (event.path === cl_common_1.commonRoutes.graphql) {
        return graphql_handler_1.apolloHandler(event, context, cb);
    }
}
exports.handler = handler;
