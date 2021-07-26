"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const nanoid_1 = require("nanoid");
const mailer_1 = require("../../lib/mailer");
const mailer_utils_1 = require("../../lib/mailer-utils");
const sequelize_1 = require("../../sequelize");
async function issueCredit(root, args, ctx) {
    ctx.internalOnly();
    const user = await cl_models_1.UserModel.findByPk(args.userId, {
        rejectOnEmpty: true
    });
    const credit = await user.createCredit({
        cents: args.cents,
        type: cl_common_1.CreditType.Appeasement,
        details: {
            reason: args.reason,
            createdBy: ctx.identity
        }
    });
    ctx.logger.info('%s cents issued to the user', credit.cents);
    await mailer_1.sendTemplatedEmail({
        templateId: 'd-ed8cf22a14234d1e82047c673af01c6e',
        to: mailer_utils_1.createRecipient(user),
        from: mailer_1.ClassMaster,
        customArgs: { amp_user_id: user.id },
        asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
        dynamicTemplateData: {
            ...mailer_utils_1.createUserParams(user),
            amount: credit.cents / 100,
            signupCredit: cl_common_1.ReferralCredits.signup / 100
        }
    });
    return credit;
}
exports.issueCredit = issueCredit;
async function backfillPayment(root, args, ctx) {
    ctx.adminOnly();
    assert.ok(args.amount > 0, 'You can only backfill offline sales');
    assert.ok(args.enrollmentIds.length > 0);
    const tx = await sequelize_1.default.transaction();
    try {
        const transaction = await cl_models_1.TransactionModel.create({
            createdAt: args.createdAt || new Date(),
            details: {
                id: nanoid_1.nanoid(8),
                type: cl_models_1.TransactionOperation.Sale,
                amount: args.amount.toString(),
                status: 'backfill',
                orderId: args.enrollmentIds.join('-')
            }
        }, { transaction: tx });
        await transaction.addEnrollments(args.enrollmentIds, {
            transaction: tx
        });
        await tx.commit();
        ctx.logger.info(`%d is backfilled manually`, args.amount);
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    return true;
}
exports.backfillPayment = backfillPayment;
