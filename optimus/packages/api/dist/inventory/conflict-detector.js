"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bustConflicts = void 0;
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const teacher_utils_1 = require("../lib/teacher-utils");
async function bustConflicts(klass) {
    const potentialTeachers = await teacher_utils_1.getPotentialTeachers(klass.startDate, klass.endDate);
    const occupancies = potentialTeachers.map(t => new teacher_utils_1.Occupancy(t));
    const potentialConflicts = await cl_models_1.ClassModel.scope([
        'defaultScope',
        'countStudent'
    ]).findAll({
        include: [
            {
                model: cl_models_1.CourseModel,
                required: true,
                attributes: ['id'],
                where: {
                    'details.official': true
                }
            }
        ],
        where: {
            active: true,
            id: {
                [sequelize_1.Op.not]: klass.id
            },
            teacherId: {
                [sequelize_1.Op.is]: null
            },
            startDate: {
                [sequelize_1.Op.lte]: klass.endDate
            },
            endDate: {
                [sequelize_1.Op.gte]: klass.startDate
            }
        }
    });
    const toKill = [];
    for (const item of potentialConflicts) {
        const available = occupancies.find(oc => oc.available(item));
        if (available) {
            available.assignClass(item);
        }
        else if (item.numberOfRegistrations === 0) {
            toKill.push(item);
        }
    }
    if (toKill.length > 0) {
        await cl_models_1.ClassModel.update({ active: false }, {
            where: {
                id: { [sequelize_1.Op.in]: toKill.map(k => k.id) }
            }
        });
    }
}
exports.bustConflicts = bustConflicts;
