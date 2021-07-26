"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const dataloader_1 = require("../lib/dataloader");
const getClassTimeFilter = (args) => {
    const filter = {};
    if (args.from) {
        filter.endDate = {
            [sequelize_1.Op.gt]: args.from
        };
    }
    if (args.to) {
        filter.startDate = {
            [sequelize_1.Op.lt]: args.to
        };
    }
    return filter;
};
exports.default = {
    async courses(t) {
        return t.courses || t.getCourses();
    },
    async emailTemplates(t) {
        return t.emailTemplates || t.getEmailTemplates();
    },
    async notes(t, args, ctx) {
        if (!ctx.isInternal) {
            return [];
        }
        return t.notes || t.getNotes();
    },
    async sessions(t, args) {
        const observedClasses = await cl_models_1.ClassObserverModel.findAll({
            where: {
                teacherId: t.id
            }
        });
        return cl_models_1.SessionModel.findAll({
            where: getClassTimeFilter(args),
            order: [['startDate', 'ASC']],
            include: [
                {
                    model: cl_models_1.StudentModel.unscoped(),
                    attributes: ['id']
                },
                {
                    model: cl_models_1.ClassModel,
                    where: {
                        [sequelize_1.Op.or]: [
                            {
                                teacherId: t.id
                            },
                            {
                                id: {
                                    [sequelize_1.Op.in]: observedClasses.map(obc => obc.classId)
                                }
                            }
                        ]
                    }
                }
            ]
        });
    },
    async students(t, args) {
        const classTimeFilter = getClassTimeFilter(args);
        const subjects = await dataloader_1.catalogStore.getSubjects();
        const courseIds = [];
        for (const sub of subjects) {
            for (const co of sub.courses) {
                if (co.isRegular) {
                    courseIds.push(co.id);
                }
            }
        }
        const records = await cl_models_1.EnrollmentModel.findAll({
            include: [
                {
                    model: cl_models_1.ClassModel.unscoped(),
                    required: true,
                    where: {
                        ...classTimeFilter,
                        teacherId: t.id,
                        courseId: {
                            [sequelize_1.Op.in]: courseIds
                        }
                    }
                }
            ]
        });
        if (records.length === 0) {
            return [];
        }
        return cl_models_1.StudentModel.findAll({
            order: [[cl_models_1.ClassModel, 'endDate', 'DESC']],
            where: {
                id: {
                    [sequelize_1.Op.in]: records.map(record => record.studentId)
                }
            },
            include: [
                {
                    model: cl_models_1.ClassModel,
                    required: true,
                    where: {
                        ...classTimeFilter,
                        courseId: {
                            [sequelize_1.Op.in]: courseIds
                        }
                    }
                }
            ]
        });
    }
};
