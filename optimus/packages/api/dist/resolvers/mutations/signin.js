"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_models_1 = require("cl-models");
async function userLogin(root, args, ctx) {
    const user = await cl_models_1.UserModel.findOne({
        where: {
            email: args.email.trim().toLowerCase()
        }
    });
    if (!user) {
        ctx.badRequest('Fail to login', {
            email: 'User not found'
        });
    }
    const fLogger = ctx.logger.child({ userId: user.id, mutation: 'userLogin' });
    const isMatch = await user.compare(args.password);
    if (!isMatch) {
        fLogger.warn('password %s does not match', args.password);
        ctx.badRequest('Fail to login', {
            password: 'Password does not match'
        });
    }
    if (args.internalOnly && !user.isInternal) {
        fLogger.warn('%s not internal user', user.email);
        ctx.badRequest('Fail to login', {
            email: '👹👹 Come back as an Admin!'
        });
    }
    if (args.teacherOnly && !user.teacherId) {
        fLogger.warn('%s not a teacher', user.email);
        ctx.badRequest('Fail to login', {
            email: '👹👹 Come back as an Teacher!'
        });
    }
    ctx.updateUser(user);
    await user.setDetails({
        lastLogin: new Date()
    });
    return user;
}
exports.userLogin = userLogin;
