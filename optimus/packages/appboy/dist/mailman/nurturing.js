"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNurturingCampaign = exports.moveUsersToNuringCampaign = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../mailer");
const mailer_utils_1 = require("../mailer-utils");
const campaigner_utils_1 = require("./campaigner-utils");
async function moveUsersToNuringCampaign(now, fLogger) {
    const candidates = new Set();
    await campaigner_utils_1.addInactiveUsers(now, candidates, fLogger);
    await campaigner_utils_1.addInactiveStudents(now, candidates, fLogger);
    if (candidates.size > 0) {
        const records = Array.from(candidates.values()).map(userId => ({
            campaign: campaigner_utils_1.campaignName,
            userId
        }));
        await cl_models_1.EmailCampaignModel.bulkCreate(records, {
            ignoreDuplicates: true
        });
    }
}
exports.moveUsersToNuringCampaign = moveUsersToNuringCampaign;
async function runNurturingCampaign(now, fLogger) {
    const campaigners = await campaigner_utils_1.getActiveCampaigners(now);
    const toBeUpdated = [];
    const toBeDeleted = [];
    const emailRecievers = [
        {
            templateId: 'd-44d1eb10e1cb4ba9b29be87d541623bf',
            recipients: []
        },
        {
            templateId: 'd-a422b88ba71b49c8b1f9e5ea7e04cdf8',
            recipients: []
        },
        {
            templateId: 'd-728cd39ad28e4f9abd9f9dd1039f330e',
            recipients: []
        },
        {
            templateId: 'd-d7315a8534484dd2b61ab4ed23dbc288',
            recipients: []
        }
    ];
    for (const campaigner of campaigners) {
        if (campaigner.user.paid) {
            toBeDeleted.push(campaigner.id);
            continue;
        }
        emailRecievers[campaigner.stage].recipients.push({
            to: mailer_utils_1.createRecipient(campaigner.user),
            customArgs: { amp_user_id: campaigner.userId },
            dynamicTemplateData: mailer_utils_1.createUserParams(campaigner.user)
        });
        toBeUpdated.push({
            id: campaigner.id,
            campaign: campaigner.campaign,
            stage: campaigner.stage + 1,
            userId: campaigner.userId,
            sentAt: now.toJSDate()
        });
        // done with the last email
        if (campaigner.stage === campaigner_utils_1.totalStages - 1) {
            toBeDeleted.push(campaigner.id);
        }
    }
    if (toBeUpdated.length > 0) {
        fLogger.info('move %d users to next stage', toBeUpdated.length);
        await cl_models_1.EmailCampaignModel.bulkCreate(toBeUpdated, {
            updateOnDuplicate: ['stage', 'sentAt', 'updatedAt']
        });
    }
    if (toBeDeleted.length > 0) {
        fLogger.info('move %d users out of campaign', toBeDeleted.length);
        await cl_models_1.EmailCampaignModel.destroy({
            where: {
                id: {
                    [sequelize_1.Op.in]: toBeDeleted
                }
            }
        });
    }
    await Promise.all(emailRecievers.map((er, idx) => {
        if (er.recipients.length === 0) {
            return;
        }
        return mailer_1.sendTemplatedEmail({
            from: mailer_1.MsCEO,
            templateId: er.templateId,
            personalizations: er.recipients,
            asm: {
                groupId: cl_common_1.UnsubscribeGroups.Newsletter
            }
        }, {
            source: `c${idx + 1}`,
            campaign: 'nurturing'
        });
    }));
}
exports.runNurturingCampaign = runNurturingCampaign;
