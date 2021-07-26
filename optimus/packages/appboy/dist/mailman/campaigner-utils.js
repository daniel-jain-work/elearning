"use strict";
/**
 * state chart: https://www.lucidchart.com/documents/edit/29c1a741-0446-4bb3-9bd9-e277c13255ab/aAAoHW~cLPXC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveCampaigners = exports.addInactiveStudents = exports.addInactiveUsers = exports.totalStages = exports.campaignName = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
exports.campaignName = 'New User Nurturing';
exports.totalStages = 2;
// users created in the past 2 days without registering classes
async function addInactiveUsers(now, candidates, fLogger) {
    const dt = now.minus({ days: 2 });
    const users = await cl_models_1.UserModel.findAll({
        attributes: ['id'],
        where: {
            paid: false,
            level: 0,
            teacherId: null,
            createdAt: {
                [sequelize_1.Op.between]: [dt.startOf('day').toJSON(), dt.endOf('day').toJSON()]
            }
        },
        include: [
            {
                model: cl_models_1.StudentModel.unscoped(),
                as: 'children',
                attributes: ['id'],
                include: [
                    {
                        model: cl_models_1.EnrollmentModel,
                        attributes: ['id']
                    }
                ]
            }
        ]
    });
    users.forEach(user => {
        for (const child of user.children) {
            if (child.enrollments.length > 0) {
                return;
            }
        }
        candidates.add(user.id);
        fLogger.info({ userId: user.id }, 'add user to campain %s', exports.campaignName);
    });
}
exports.addInactiveUsers = addInactiveUsers;
// students who have never paid and not scheduling any new clasees after 3 days
async function addInactiveStudents(now, candidates, fLogger) {
    const dt = now.minus({ days: 3 });
    const enrollments = await cl_models_1.EnrollmentModel.findAll({
        attributes: ['id'],
        where: {
            updatedAt: {
                [sequelize_1.Op.between]: [dt.startOf('day').toJSON(), dt.endOf('day').toJSON()]
            }
        },
        include: [
            {
                model: cl_models_1.StudentModel,
                required: true,
                include: [
                    {
                        model: cl_models_1.ClassModel.unscoped(),
                        attributes: ['id'],
                        required: false,
                        where: {
                            endDate: {
                                [sequelize_1.Op.gt]: now.toJSDate()
                            }
                        }
                    }
                ]
            }
        ]
    });
    enrollments.forEach(er => {
        if (er.student.parent.paid ||
            er.student.parent.teacherId ||
            er.student.parent.level > cl_common_1.UserLevel.REGULAR ||
            er.student.classes.length > 0) {
            return;
        }
        fLogger.info({ userId: er.student.parentId }, 'add user to campain %s', exports.campaignName);
        candidates.add(er.student.parentId);
    });
}
exports.addInactiveStudents = addInactiveStudents;
async function getActiveCampaigners(now) {
    const twoDaysAgo = now.minus({ days: 2 });
    return cl_models_1.EmailCampaignModel.findAll({
        include: [cl_models_1.UserModel],
        where: {
            campaign: exports.campaignName,
            [sequelize_1.Op.or]: [
                {
                    stage: 0
                },
                {
                    stage: {
                        [sequelize_1.Op.gt]: 0,
                        [sequelize_1.Op.lt]: exports.totalStages
                    },
                    sentAt: {
                        [sequelize_1.Op.lt]: twoDaysAgo.endOf('day').toJSDate()
                    }
                }
            ]
        }
    });
}
exports.getActiveCampaigners = getActiveCampaigners;
