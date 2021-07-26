"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanStock = void 0;
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const google_calendar_1 = require("../lib/google-calendar");
const sequelize_2 = require("../sequelize");
const deadListingQuery = `
  SELECT *
  FROM ${cl_models_1.ClassModel.tableName}
  WHERE active = false
    AND endDate > CURTIME()
    AND teacherId IS NULL
    AND id NOT IN (
      SELECT classId FROM ${cl_models_1.EnrollmentModel.tableName}
      UNION SELECT classId FROM ${cl_models_1.MoverModel.tableName}
      UNION SELECT originalClassId FROM ${cl_models_1.MoverModel.tableName}
      UNION SELECT classId FROM ${cl_models_1.ThreadModel.tableName}
    )
`;
async function cleanStock(fLogger) {
    const deadlist = await sequelize_2.default.query(deadListingQuery, {
        type: sequelize_1.QueryTypes.SELECT,
        mapToModel: true,
        model: cl_models_1.ClassModel
    });
    if (deadlist.length === 0) {
        return;
    }
    for (const klass of deadlist) {
        await google_calendar_1.deleteEvent(klass, fLogger.child({ classId: klass.id }));
    }
    const deleted = await cl_models_1.ClassModel.destroy({
        where: {
            id: {
                [sequelize_1.Op.in]: deadlist.map(k => k.id)
            }
        }
    });
    fLogger.info('%d dead class deleted', deleted);
}
exports.cleanStock = cleanStock;
