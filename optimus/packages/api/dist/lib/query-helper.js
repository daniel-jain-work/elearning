"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
function getTimeRule(args) {
    if (args.from && args.to) {
        return {
            [sequelize_1.Op.between]: [args.from, args.to]
        };
    }
    else if (args.from) {
        return {
            [sequelize_1.Op.gte]: args.from
        };
    }
    else if (args.to) {
        return {
            [sequelize_1.Op.lte]: args.to
        };
    }
    return null;
}
exports.getTimeRule = getTimeRule;
