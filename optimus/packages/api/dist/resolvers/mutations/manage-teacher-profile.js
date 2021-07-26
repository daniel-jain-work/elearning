"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTeacherAvailability = exports.clearTeacherBlackoutDate = exports.setTeacherBlackoutDate = exports.editTeacherProfile = exports.removeTeacher = exports.createTeacher = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const libphonenumber_js_1 = require("libphonenumber-js");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const dataloader_1 = require("../../lib/dataloader");
const s3_utils_1 = require("../../lib/s3-utils");
const teacher_utils_1 = require("../../lib/teacher-utils");
const sequelize_1 = require("../../sequelize");
async function createTeacher(_, args, ctx) {
    var _a;
    ctx.adminOnly();
    const tx = await sequelize_1.default.transaction();
    const email = args.email.toLowerCase().trim();
    try {
        const [user] = await cl_models_1.UserModel.findOrCreate({
            transaction: tx,
            where: { email },
            defaults: {
                email: args.email,
                password: args.password.trim(),
                firstName: args.firstName,
                lastName: args.lastName,
                details: {
                    timezone: cl_common_1.defaultTimezone,
                    source: 'teacher'
                }
            }
        });
        const teacher = await cl_models_1.TeacherModel.create({
            email,
            userId: user.id,
            tokens: 3,
            firstName: args.firstName,
            lastName: args.lastName,
            details: {
                timezone: user.timezone
            }
        }, { transaction: tx });
        if (((_a = args.capabilities) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            await setCapabilities(teacher, args, tx);
        }
        await user.setTeacher(teacher, {
            transaction: tx
        });
        await cl_models_1.StudentModel.create({
            name: user.firstName,
            parentId: user.id
        }, { transaction: tx });
        await tx.commit();
        dataloader_1.teacherStore.update(teacher);
        ctx.logger.info({ teacherId: teacher.id }, 'teacher %s created', teacher.fullName);
        return teacher;
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
}
exports.createTeacher = createTeacher;
async function removeTeacher(_, args, ctx) {
    ctx.adminOnly();
    const teacher = await cl_models_1.TeacherModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.UserModel]
    });
    const tx = await sequelize_1.default.transaction();
    try {
        if (teacher.user) {
            await teacher.user.setTeacher(null, {
                transaction: tx
            });
        }
        await teacher.destroy({ transaction: tx });
        await tx.commit();
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    dataloader_1.teacherStore.delete(teacher.id);
    return true;
}
exports.removeTeacher = removeTeacher;
async function editTeacherProfile(_, args, ctx) {
    ctx.ownerOrInternal(args.id);
    const teacher = await cl_models_1.TeacherModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.TeacherCourseModel]
    });
    const details = {
        ...teacher.details,
        ...lodash_1.pick(args, ['bio', 'experiences'])
    };
    if (args.phoneNumber) {
        const phoneNumber = libphonenumber_js_1.parsePhoneNumberFromString(args.phoneNumber, 'US');
        if (phoneNumber && phoneNumber.isValid) {
            details.phoneNumber = phoneNumber.number.toString();
        }
        else {
            ctx.badRequest('Not a valid US phone number', args);
        }
    }
    if (args.avatar) {
        const fileName = teacher.fullName + '_' + Date.now();
        const uploadResult = await s3_utils_1.uploadAvatar(fileName, args.avatar.content);
        details.avatar = uploadResult.resultURL;
    }
    const tx = await sequelize_1.default.transaction();
    try {
        await teacher.update({ details, firstName: args.firstName, lastName: args.lastName }, { transaction: tx });
        if (ctx.isAdmin) {
            await setCapabilities(teacher, args, tx);
        }
        await tx.commit();
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    dataloader_1.teacherStore.update(teacher);
    ctx.logger.info({ teacherId: args.id }, '%s profile updated %o', teacher.fullName, teacher.details);
    return teacher;
}
exports.editTeacherProfile = editTeacherProfile;
async function setCapabilities(teacher, args, tx) {
    if (!args.capabilities) {
        return;
    }
    await cl_models_1.TeacherCourseModel.destroy({
        where: { teacherId: teacher.id },
        transaction: tx
    });
    const items = args.capabilities.map(capability => ({
        teacherId: teacher.id,
        courseId: capability.courseId,
        priority: capability.priority
    }));
    if (items.length > 0) {
        await cl_models_1.TeacherCourseModel.bulkCreate(items, {
            updateOnDuplicate: ['priority'],
            transaction: tx
        });
    }
}
function getValidBlackoutDate(t, isoDate) {
    const today = luxon_1.DateTime.local().toISODate();
    return t.blackoutDates.filter(bd => {
        return bd !== isoDate && bd >= today;
    });
}
async function setTeacherBlackoutDate(_, args, ctx) {
    ctx.onwerOrAdmin(args.teacherId);
    const teacher = await cl_models_1.TeacherModel.findByPk(args.teacherId, {
        rejectOnEmpty: true
    });
    const isoDate = luxon_1.DateTime.fromJSDate(args.date, { zone: 'utc' }).toISODate();
    const blackoutDates = getValidBlackoutDate(teacher, isoDate).concat(isoDate);
    await teacher.update({
        'details.blackoutDates': blackoutDates
    });
    dataloader_1.teacherStore.update(teacher);
    return teacher;
}
exports.setTeacherBlackoutDate = setTeacherBlackoutDate;
async function clearTeacherBlackoutDate(_, args, ctx) {
    ctx.onwerOrAdmin(args.teacherId);
    const teacher = await cl_models_1.TeacherModel.findByPk(args.teacherId, {
        rejectOnEmpty: true
    });
    const isoDate = luxon_1.DateTime.fromJSDate(args.date, { zone: 'utc' }).toISODate();
    const blackoutDates = getValidBlackoutDate(teacher, isoDate);
    await teacher.update({
        'details.blackoutDates': blackoutDates
    });
    dataloader_1.teacherStore.update(teacher);
    return teacher;
}
exports.clearTeacherBlackoutDate = clearTeacherBlackoutDate;
async function updateTeacherAvailability(_, args, ctx) {
    ctx.onwerOrAdmin(args.teacherId);
    const teacher = await cl_models_1.TeacherModel.findByPk(args.teacherId, {
        rejectOnEmpty: true
    });
    const availableTime = args.availabilities.map(availability => ({
        day: availability.day,
        times: availability.times
            // sort time so start time is smaller than end time
            .map(arr => arr.sort((a, b) => a - b))
            // merge overlapping and adjacent time intervals
            .sort((a, b) => a[0] - b[0])
            .reduce((acc, value) => {
            if (acc.length === 0)
                return [value];
            const lastInterval = lodash_1.last(acc);
            if (value[0] - lastInterval[1] <= 0) {
                return [...acc.slice(0, -1), [lastInterval[0], value[1]]];
            }
            else {
                return [...acc, value];
            }
        }, [])
    }));
    await teacher.update({
        'details.availableTime': availableTime,
        'details.hours': teacher_utils_1.calculateWorkingHours(availableTime)
    });
    dataloader_1.teacherStore.update(teacher);
    return teacher;
}
exports.updateTeacherAvailability = updateTeacherAvailability;
