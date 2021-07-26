"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_models_1 = require("cl-models");
const config = require("config");
exports.default = cl_models_1.initModels(config.get('rds'));
