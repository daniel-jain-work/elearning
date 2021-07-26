"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHostAvailable = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
async function isHostAvailable(klass) {
    if (!klass.zoomhostId) {
        return true;
    }
    const timeQuery = klass.sessions.map(ses => ({
        startDate: {
            [sequelize_1.Op.lte]: luxon_1.DateTime.fromJSDate(ses.endDate)
                .plus({ minutes: cl_common_1.coolDownInterval })
                .toJSDate()
        },
        endDate: {
            [sequelize_1.Op.gte]: luxon_1.DateTime.fromJSDate(ses.startDate)
                .minus({ minutes: cl_common_1.coolDownInterval })
                .toJSDate()
        }
    }));
    const conflict = await cl_models_1.SessionModel.findOne({
        include: [
            {
                model: cl_models_1.ClassModel.unscoped(),
                attributes: ['id'],
                required: true,
                where: {
                    zoomhostId: klass.zoomhostId,
                    id: {
                        [sequelize_1.Op.not]: klass.id
                    }
                }
            }
        ],
        where: {
            [sequelize_1.Op.or]: timeQuery
        }
    });
    return !conflict;
}
exports.isHostAvailable = isHostAvailable;
