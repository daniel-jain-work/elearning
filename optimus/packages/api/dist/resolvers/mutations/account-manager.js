"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagUserGeolocation = exports.changePassword = exports.userLogin = void 0;
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const ipstack_1 = require("../../lib/ipstack");
async function userLogin(_, args, ctx) {
    const user = await cl_models_1.UserModel.findOne({
        include: [cl_models_1.TeacherModel],
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
    if (args.timezone && luxon_1.IANAZone.isValidZone(args.timezone)) {
        if (args.timezone !== user.timezone) {
            await user.update({
                'details.timezone': args.timezone
            });
        }
        if (user.teacher && user.teacher.timezone !== args.timezone) {
            await user.teacher.update({
                'details.timezone': args.timezone
            });
        }
    }
    ctx.updateUser(user);
    return user;
}
exports.userLogin = userLogin;
async function changePassword(_, args, ctx) {
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
async function tagUserGeolocation(_, args, ctx) {
    const user = await cl_models_1.UserModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    if (user.clientIp) {
        await ipstack_1.geoTagUser(user, ctx.logger);
    }
    return user;
}
exports.tagUserGeolocation = tagUserGeolocation;
