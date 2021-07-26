"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyCreditRewards = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../mailer");
const mailer_utils_1 = require("../mailer-utils");
async function notifyCreditRewards(now, fLogger) {
    const startTime = now.minus({
        days: 1
    });
    const credits = await cl_models_1.CreditModel.findAll({
        include: [
            {
                model: cl_models_1.UserModel,
                required: true
            }
        ],
        where: {
            type: cl_common_1.CreditType.Referral,
            createdAt: {
                [sequelize_1.Op.between]: [
                    startTime.startOf('day').toJSON(),
                    startTime.endOf('day').toJSON()
                ]
            }
        }
    });
    const personalizationsList = await Promise.all(credits.map(async (credit) => {
        const referral = await cl_models_1.UserModel.findByPk(credit.attribution.userId);
        if (!referral || !referral.accountChangeNotification) {
            fLogger.error(`Referral user ${credit.attribution.userId} not found!`);
            return null;
        }
        return {
            to: mailer_utils_1.createRecipient(credit.user),
            customArgs: {
                amp_user_id: credit.userId
            },
            dynamicTemplateData: {
                ...mailer_utils_1.createUserParams(credit.user),
                referralName: referral.firstName,
                amount: credit.cents / 100
            }
        };
    }));
    const personalizations = personalizationsList.filter(Boolean);
    if (personalizations.length > 0) {
        await mailer_1.sendTemplatedEmail({
            from: mailer_1.MsOps,
            templateId: 'd-1bbfc439e88246bebcacb0a9c52e8385',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            personalizations
        });
    }
}
exports.notifyCreditRewards = notifyCreditRewards;
