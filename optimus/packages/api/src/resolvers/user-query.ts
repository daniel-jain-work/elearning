import { CourseModel, UserModel } from 'cl-models';

export default {
  async balance(user: UserModel) {
    const balanceInCents = await user.getBalanceInCents();
    return balanceInCents / 100;
  },

  async credits(user: UserModel) {
    return user.credits || user.getCredits({ order: [['createdAt', 'DESC']] });
  },

  async children(user: UserModel) {
    return user.children || user.getChildren({ order: [['createdAt', 'DESC']] });
  },

  async affiliate(user: UserModel) {
    return user.affiliate || user.getAffiliate();
  },

  async partner(user: UserModel) {
    return (
      user.partner ||
      user.getPartner({
        include: [CourseModel]
      })
    );
  },

  async referer(user: UserModel) {
    return user.referer || user.getReferer();
  },

  async promotions(user: UserModel) {
    const promotions =
      user.promotions ||
      (await user.getPromotions({ order: [['createdAt', 'DESC']] }));
    return promotions.filter(promo => promo.isValid);
  }
};
