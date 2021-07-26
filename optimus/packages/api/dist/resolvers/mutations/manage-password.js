"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_models_1 = require("cl-models");
async function changePassword(root, args, ctx) {
    const user = await cl_models_1.UserModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    const isMatch = await user.compare(args.previous);
    if (!ctx.isAdmin && !isMatch) {
        ctx.logger.warn({ userId: user.id }, 'old password %s does not match', args.previous);
        ctx.badRequest('Fail to login', {
            previous: 'Old Password does not match'
        });
    }
    await user.update({
        password: args.password
    });
    return true;
}
exports.changePassword = changePassword;
