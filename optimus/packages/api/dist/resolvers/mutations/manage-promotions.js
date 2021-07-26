"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPromotion = exports.updatePromotion = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const lodash_1 = require("lodash");
function buildPromotion(args, ctx) {
    if (args.amount < 0 || args.amountInPackage < 0) {
        ctx.badRequest('Discount cannot be negative');
    }
    if (args.type === cl_common_1.CouponType.PercentOff &&
        (args.amount > 100 || args.amountInPackage > 100)) {
        ctx.badRequest('Discount cannot be larger than 100%');
    }
    const promoDetails = {
        ...lodash_1.pick(args, 'allowance', 'isLevelUp', 'firstTimerOnly'),
        createdBy: ctx.identity
    };
    return {
        type: args.type,
        amount: args.amount,
        amountInPackage: args.amountInPackage,
        expiresAt: args.expiresAt ? new Date(args.expiresAt) : null,
        details: promoDetails
    };
}
async function updatePromotion(root, args, ctx) {
    ctx.adminOnly();
    const promotion = await cl_models_1.PromotionModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    await promotion.update(buildPromotion(args, ctx));
    ctx.logger.info({ promotionId: promotion.id, mutation: 'updatePromotion', payload: args }, 'promotion %s updated', promotion.code);
    return promotion;
}
exports.updatePromotion = updatePromotion;
async function createPromotion(root, args, ctx) {
    ctx.adminOnly();
    const promotion = new cl_models_1.PromotionModel(buildPromotion(args, ctx));
    promotion.set('code', args.code.trim());
    await promotion.save();
    ctx.logger.info({ promotionId: promotion.id, mutation: 'createPromotion', payload: args }, 'promotion %s created', promotion.code);
    return promotion;
}
exports.createPromotion = createPromotion;
