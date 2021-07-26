"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = require("config");
const pino = require("pino");
exports.default = pino({
    ...config.get('logger'),
    formatters: {
        level: level => ({
            level
        })
    }
});
