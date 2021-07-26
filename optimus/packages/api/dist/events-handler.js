"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEvent = void 0;
const catalog_cache_1 = require("./lib/catalog-cache");
const logger_1 = require("./lib/logger");
const class_enrolled_1 = require("./web-events/class-enrolled");
const class_updated_1 = require("./web-events/class-updated");
async function handleEvent(type, payload) {
    await catalog_cache_1.loadCache();
    const fLogger = logger_1.default.child({ event: type, ...payload });
    switch (type) {
        case 'CLASS_FULL':
            await class_updated_1.handleClassFull(payload, fLogger);
            break;
        case 'CLASS_ENROLLED':
            await class_enrolled_1.handleClassEnrolled(payload, fLogger);
            break;
        default:
            throw new Error(`Unknown event: ${type}`);
    }
}
exports.handleEvent = handleEvent;
