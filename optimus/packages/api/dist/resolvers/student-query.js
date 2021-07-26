"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_models_1 = require("cl-models");
const dataloader_1 = require("../lib/dataloader");
const recommendations_1 = require("../lib/recommendations");
exports.default = {
    async classes(s) {
        return (s.classes ||
            s.getClasses({
                include: [cl_models_1.TeacherModel]
            }));
    },
    async addons(s) {
        return (s.addons ||
            s.getAddons({
                include: [
                    {
                        model: cl_models_1.ClassModel,
                        include: [cl_models_1.TeacherModel]
                    }
                ]
            }));
    },
    async notes(s, args, ctx) {
        if (!ctx.isInternal) {
            return [];
        }
        return s.notes || s.getNotes();
    },
    async enrollments(s) {
        return (s.enrollments ||
            s.getEnrollments({
                include: [
                    cl_models_1.CreditModel,
                    cl_models_1.PromotionModel,
                    cl_models_1.TransactionModel,
                    {
                        model: cl_models_1.ClassModel,
                        include: [cl_models_1.TeacherModel]
                    }
                ]
            }));
    },
    async nextup(s, args) {
        const classes = await s.getClasses({
            order: [['startDate', 'ASC']]
        });
        let registration;
        let recommendation = await recommendations_1.getRecommendation(s.age, classes);
        if (args.classId) {
            const klass = await cl_models_1.ClassModel.findByPk(args.classId, {
                rejectOnEmpty: true
            });
            if (!recommendation) {
                recommendation = await dataloader_1.catalogStore.getNextLevel(klass);
            }
            if (recommendation) {
                registration = classes.find(cls => cls.courseId === recommendation.id && cls.id !== args.classId);
            }
            if (!registration) {
                registration = classes.find(cls => cls.startDate > klass.endDate);
            }
        }
        return {
            recommendation,
            registration
        };
    }
};
