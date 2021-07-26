"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async balance(user) {
        const balanceInCents = await user.getBalanceInCents();
        return balanceInCents / 100;
    },
    async credits(user) {
        return user.credits || user.getCredits({ order: [['createdAt', 'DESC']] });
    },
    async children(user) {
        return user.children || user.getChildren({ order: [['createdAt', 'DESC']] });
    },
    async affiliate(user) {
        return user.affiliate || user.getAffiliate();
    },
    async referer(user) {
        return user.referer || user.getReferer();
    },
    async promotions(user) {
        const promotions = user.promotions ||
            (await user.getPromotions({ order: [['createdAt', 'DESC']] }));
        return promotions.filter(promo => promo.isValid);
    }
};
