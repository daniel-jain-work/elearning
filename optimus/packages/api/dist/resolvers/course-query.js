"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataloader_1 = require("../lib/dataloader");
exports.default = {
    subject(c) {
        return c.subject || dataloader_1.catalogStore.getSubjectById(c.subjectId);
    },
    teachers(c) {
        return c.teachers || c.getTeachers();
    },
    async offer(c) {
        const promos = c.promotions || (await c.getPromotions());
        return promos.find(p => p.isValid);
    }
};
