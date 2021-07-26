"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePartner = exports.createPartner = void 0;
const cl_models_1 = require("cl-models");
const nanoid_1 = require("nanoid");
const sequelize_1 = require("../../sequelize");
async function createPartner(root, args, ctx) {
    ctx.adminOnly();
    const partner = new cl_models_1.PartnerModel({ code: nanoid_1.nanoid(8) });
    setPartnerAttributes(partner, args);
    ctx.logger.info({ payload: args }, 'partner %s is created ', partner.name);
    return partner.save();
}
exports.createPartner = createPartner;
async function updatePartner(root, args, ctx) {
    ctx.adminOnly();
    const partner = await cl_models_1.PartnerModel.findByPk(args.id, { rejectOnEmpty: true });
    setPartnerAttributes(partner, args);
    const tx = await sequelize_1.default.transaction();
    try {
        if (args.courseIds) {
            await partner.setCourses(args.courseIds, { transaction: tx });
        }
        await partner.save({ transaction: tx });
        await tx.commit();
        ctx.logger.info({ payload: args }, 'partner %s is updated', partner.name);
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
}
exports.updatePartner = updatePartner;
function setPartnerAttributes(partner, attrs) {
    const { email, ...details } = attrs;
    if (email) {
        partner.set('email', email);
    }
    partner.set('details', {
        ...partner.details,
        ...details
    });
}
