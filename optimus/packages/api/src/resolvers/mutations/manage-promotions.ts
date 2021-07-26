import { Graphql } from '@cl/types';
import { CouponType } from 'cl-common';
import { PromotionModel } from 'cl-models';
import { pick } from 'lodash';
import { GraphqlContext } from '../../graphql-handler';

function buildPromotion(args: Graphql.CreatePromotionArgs, ctx: GraphqlContext) {
  if (args.amount < 0 || args.amountInPackage < 0) {
    ctx.badRequest('Discount cannot be negative');
  }

  if (
    args.type === CouponType.PercentOff &&
    (args.amount > 100 || args.amountInPackage > 100)
  ) {
    ctx.badRequest('Discount cannot be larger than 100%');
  }

  const promoDetails: PromotionModel['details'] = {
    ...pick(args, 'allowance', 'isLevelUp', 'firstTimerOnly'),
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

export async function updatePromotion(
  root: any,
  args: Graphql.UpdatePromotionArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const promotion = await PromotionModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  await promotion.update(buildPromotion(args, ctx));

  ctx.logger.info(
    { promotionId: promotion.id, mutation: 'updatePromotion', payload: args },
    'promotion %s updated',
    promotion.code
  );

  return promotion;
}

export async function createPromotion(
  root: any,
  args: Graphql.CreatePromotionArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const promotion = new PromotionModel(buildPromotion(args, ctx));
  promotion.set('code', args.code.trim());
  await promotion.save();

  ctx.logger.info(
    { promotionId: promotion.id, mutation: 'createPromotion', payload: args },
    'promotion %s created',
    promotion.code
  );

  return promotion;
}
