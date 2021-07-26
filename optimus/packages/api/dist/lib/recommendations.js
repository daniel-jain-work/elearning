"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendation = exports.isCodingType = exports.getOptionsByAge = void 0;
const cl_common_1 = require("cl-common");
const dataloader_1 = require("../lib/dataloader");
const optionsByAge = {
    7: [cl_common_1.Topic.SN, cl_common_1.Topic.ROBO],
    8: [cl_common_1.Topic.SN, cl_common_1.Topic.ROBO],
    9: [cl_common_1.Topic.SN, cl_common_1.Topic.AI, cl_common_1.Topic.ROBO, cl_common_1.Topic.DS],
    10: [cl_common_1.Topic.SN, cl_common_1.Topic.AI, cl_common_1.Topic.ROBO, cl_common_1.Topic.MC, cl_common_1.Topic.DS],
    11: [cl_common_1.Topic.AS, cl_common_1.Topic.AI, cl_common_1.Topic.ROBO, cl_common_1.Topic.MC, cl_common_1.Topic.DS, cl_common_1.Topic.WEB, cl_common_1.Topic.PY],
    12: [cl_common_1.Topic.AS, cl_common_1.Topic.AI, cl_common_1.Topic.ROBO, cl_common_1.Topic.MC, cl_common_1.Topic.DS, cl_common_1.Topic.WEB, cl_common_1.Topic.PY],
    13: [cl_common_1.Topic.AS, cl_common_1.Topic.AI, cl_common_1.Topic.ROBO, cl_common_1.Topic.MC, cl_common_1.Topic.DS, cl_common_1.Topic.WEB, cl_common_1.Topic.PY],
    14: [cl_common_1.Topic.AS, cl_common_1.Topic.AI, cl_common_1.Topic.ROBO, cl_common_1.Topic.MC, cl_common_1.Topic.DS, cl_common_1.Topic.WEB, cl_common_1.Topic.PY],
    15: [cl_common_1.Topic.PY, cl_common_1.Topic.AI, cl_common_1.Topic.ROBO, cl_common_1.Topic.MC, cl_common_1.Topic.DS, cl_common_1.Topic.WEB]
};
function getOptionsByAge(age) {
    return optionsByAge[age] || [cl_common_1.Topic.SN, cl_common_1.Topic.AI];
}
exports.getOptionsByAge = getOptionsByAge;
function isCodingType(subjectId) {
    return [cl_common_1.Topic.SN, cl_common_1.Topic.AS, cl_common_1.Topic.MC, cl_common_1.Topic.WEB, cl_common_1.Topic.PY].includes(subjectId);
}
exports.isCodingType = isCodingType;
async function getRecommendation(age = 0, alreadyDone) {
    let hasDoneCoding = false;
    const suppress = new Map();
    for (const cls of alreadyDone) {
        const { subjectId, level } = await dataloader_1.catalogStore.getCourseById(cls.courseId);
        if (!hasDoneCoding && isCodingType(subjectId)) {
            hasDoneCoding = true;
        }
        if (!suppress.has(subjectId) || suppress.get(subjectId) < level) {
            suppress.set(subjectId, level);
            // don't recommend scratch or accelerated scratch if student has done one of it
            if (subjectId === cl_common_1.Topic.SN) {
                suppress.set(cl_common_1.Topic.AS, level);
            }
            else if (subjectId === cl_common_1.Topic.AS) {
                suppress.set(cl_common_1.Topic.SN, level);
            }
        }
    }
    for (const subjectId of getOptionsByAge(age)) {
        const subject = await dataloader_1.catalogStore.getSubjectById(subjectId);
        if (suppress.has(subjectId)) {
            const finalLevel = suppress.get(subjectId);
            if (finalLevel < subject.exitLevel) {
                return subject.courses.find(c => c.level === finalLevel + 1);
            }
            continue;
        }
        if (hasDoneCoding && isCodingType(subjectId)) {
            continue;
        }
        return subject.courses.find(c => c.level === 1);
    }
}
exports.getRecommendation = getRecommendation;
