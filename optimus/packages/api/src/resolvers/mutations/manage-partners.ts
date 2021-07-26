import { Graphql } from '@cl/types';
import { PartnerModel, UserModel } from 'cl-models';
import { nanoid } from 'nanoid';
import { GraphqlContext } from '../../graphql-handler';
import sequelize from '../../sequelize';

export async function createPartner(
  _,
  args: Graphql.CreatePartnerArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const partner = new PartnerModel({ code: nanoid(8) });
  setPartnerAttributes(partner, args);
  await partner.save();
  ctx.logger.info({ payload: args }, 'partner %s is created ', partner.name);

  const user = await UserModel.findOne({
    where: { email: partner.email }
  });
  if (user) {
    ctx.logger.info({ userId: user.id }, 'link user and partner');
    await user.setPartner(partner);
  }

  return partner;
}

export async function updatePartner(
  _,
  args: Graphql.UpdatePartnerArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const partner = await PartnerModel.findByPk(args.id, { rejectOnEmpty: true });
  setPartnerAttributes(partner, args);

  const tx = await sequelize.transaction();
  try {
    if (args.courseIds) {
      await partner.setCourses(args.courseIds, { transaction: tx });
    }

    await partner.save({ transaction: tx });
    await tx.commit();

    ctx.logger.info({ payload: args }, 'partner %s is updated', partner.name);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function setPartnerAttributes(
  partner: PartnerModel,
  attrs: Omit<Graphql.UpdatePartnerArgs, 'id' | 'courseIds'>
) {
  const { email, ...details } = attrs;
  if (email) {
    partner.set('email', email);
  }

  partner.set('details', {
    ...partner.details,
    ...details
  });
}
