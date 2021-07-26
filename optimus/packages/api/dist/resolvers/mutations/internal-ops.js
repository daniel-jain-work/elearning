"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCronTask = exports.attributePurchase = exports.createBackfill = exports.takeDownConflicts = exports.syncWorkingHours = exports.mergeStudentRecords = exports.backfillReferral = exports.backfillPayment = exports.issueCredit = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const nanoid_1 = require("nanoid");
const sequelize_1 = require("sequelize");
const backfill_1 = require("../../inventory/backfill");
const cleaner_1 = require("../../inventory/cleaner");
const conflict_detector_1 = require("../../inventory/conflict-detector");
const planner_1 = require("../../inventory/planner");
const dataloader_1 = require("../../lib/dataloader");
const mailer_1 = require("../../lib/mailer");
const mailer_utils_1 = require("../../lib/mailer-utils");
const teacher_utils_1 = require("../../lib/teacher-utils");
const sequelize_2 = require("../../sequelize");
const newsman_1 = require("../../technews/newsman");
async function issueCredit(root, args, ctx) {
    ctx.internalOnly();
    const user = await cl_models_1.UserModel.findByPk(args.userId, {
        rejectOnEmpty: true
    });
    const credit = await user.createCredit({
        cents: args.cents,
        type: cl_common_1.CreditType.Appeasement,
        details: {
            reason: args.reason,
            createdBy: ctx.identity
        }
    });
    ctx.logger.info('%s cents issued to the user', credit.cents);
    await mailer_1.sendTemplatedEmail({
        templateId: 'd-ed8cf22a14234d1e82047c673af01c6e',
        to: mailer_utils_1.createRecipient(user),
        from: mailer_1.ClassMaster,
        customArgs: { amp_user_id: user.id },
        asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
        dynamicTemplateData: {
            ...mailer_utils_1.createUserParams(user),
            amount: credit.cents / 100,
            signupCredit: cl_common_1.ReferralCredits.signup / 100
        }
    });
    return credit;
}
exports.issueCredit = issueCredit;
async function backfillPayment(_, args, ctx) {
    ctx.adminOnly();
    if (!(args.amount > 0 && args.enrollmentIds.length > 0)) {
        ctx.badRequest('You can only backfill offline sales', args);
    }
    const tx = await sequelize_2.default.transaction();
    try {
        const transaction = await cl_models_1.TransactionModel.create({
            createdAt: args.createdAt || new Date(),
            details: {
                id: nanoid_1.nanoid(8),
                type: cl_models_1.TransactionOperation.Sale,
                amount: args.amount.toString(),
                status: 'backfill',
                orderId: args.enrollmentIds.join('-')
            }
        }, { transaction: tx });
        await transaction.addEnrollments(args.enrollmentIds, {
            transaction: tx
        });
        await tx.commit();
        ctx.logger.info(`%d is backfilled manually`, args.amount);
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    return true;
}
exports.backfillPayment = backfillPayment;
async function backfillReferral(_, args, ctx) {
    ctx.adminOnly();
    const user = await cl_models_1.UserModel.findOne({
        rejectOnEmpty: true,
        where: {
            email: args.email
        }
    });
    const tx = await sequelize_2.default.transaction();
    try {
        if (!user.refererId) {
            // switch to a different referer
            await user.createCredit({
                cents: cl_common_1.ReferralCredits.signup,
                type: cl_common_1.CreditType.Welcome,
                details: {
                    reason: 'Referral bonus for new user',
                    createdBy: 'backfill',
                    attribution: {
                        userId: args.refererId
                    }
                }
            }, {
                transaction: tx
            });
        }
        await user.setReferer(args.refererId, {
            transaction: tx
        });
        await tx.commit();
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    return user;
}
exports.backfillReferral = backfillReferral;
async function mergeStudentRecords(_, args, ctx) {
    ctx.adminOnly();
    const source = await cl_models_1.StudentModel.findByPk(args.source, {
        rejectOnEmpty: true,
        include: [cl_models_1.EnrollmentModel, cl_models_1.NoteModel, cl_models_1.ProjectModel]
    });
    const target = await cl_models_1.StudentModel.findByPk(args.target, {
        rejectOnEmpty: true
    });
    const tx = await sequelize_2.default.transaction();
    try {
        if (source.enrollments.length > 0) {
            const enrollmentIds = source.enrollments.map(en => en.id);
            ctx.logger.info('move enrollments %o to %s', enrollmentIds, target.name);
            await cl_models_1.EnrollmentModel.update({ studentId: target.id }, {
                transaction: tx,
                where: {
                    id: { [sequelize_1.Op.in]: enrollmentIds }
                }
            });
        }
        if (source.projects.length > 0) {
            const projectIds = source.projects.map(en => en.id);
            ctx.logger.info('move projects %o to %s', projectIds, target.name);
            await cl_models_1.ProjectModel.update({ studentId: target.id }, {
                transaction: tx,
                where: {
                    id: { [sequelize_1.Op.in]: projectIds }
                }
            });
        }
        if (source.notes.length > 0) {
            const noteIds = source.notes.map(en => en.id);
            ctx.logger.info('move notes %o to %s', noteIds, target.name);
            await cl_models_1.NoteModel.update({ studentId: target.id }, {
                transaction: tx,
                where: {
                    id: { [sequelize_1.Op.in]: noteIds }
                }
            });
        }
        await source.destroy({ transaction: tx });
        await tx.commit();
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    return target;
}
exports.mergeStudentRecords = mergeStudentRecords;
async function syncWorkingHours(_, args, ctx) {
    ctx.adminOnly();
    const teachers = await cl_models_1.TeacherModel.findAll({
        where: {
            active: true
        }
    });
    const diff = teachers.map(t => ({
        t: t.id,
        email: t.email,
        details: {
            ...t.details,
            hours: teacher_utils_1.calculateWorkingHours(t.availableTime)
        }
    }));
    return cl_models_1.TeacherModel.bulkCreate(diff, {
        updateOnDuplicate: ['details']
    });
}
exports.syncWorkingHours = syncWorkingHours;
async function takeDownConflicts(_, args, ctx) {
    ctx.adminOnly();
    const klass = await cl_models_1.ClassModel.findByPk(args.id);
    if (klass) {
        await conflict_detector_1.bustConflicts(klass);
        return true;
    }
    return false;
}
exports.takeDownConflicts = takeDownConflicts;
async function createBackfill(_, args, ctx) {
    ctx.adminOnly();
    const klass = await cl_models_1.ClassModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel]
    });
    return backfill_1.scheduleBackupClass(klass, klass.course, ctx.logger);
}
exports.createBackfill = createBackfill;
async function attributePurchase(_, args, ctx) {
    ctx.adminOnly();
    const current = await cl_models_1.EnrollmentModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.ClassModel.unscoped()]
    });
    const course = await dataloader_1.catalogStore.getCourseById(current.class.courseId);
    if (!course.isRegular) {
        return null;
    }
    const prior = await cl_models_1.EnrollmentModel.findOne({
        order: [
            [cl_models_1.ClassModel, cl_models_1.CourseModel, 'level', 'DESC'],
            ['statusCode', 'DESC']
        ],
        where: {
            studentId: current.studentId
        },
        include: [
            {
                model: cl_models_1.ClassModel.unscoped(),
                required: true,
                where: {
                    startDate: {
                        [sequelize_1.Op.lt]: new Date()
                    }
                },
                include: [
                    {
                        model: cl_models_1.TeacherModel,
                        required: true
                    },
                    {
                        model: cl_models_1.CourseModel,
                        required: true,
                        where: {
                            subjectId: course.subjectId,
                            level: {
                                [sequelize_1.Op.gte]: 0,
                                [sequelize_1.Op.lt]: course.level
                            }
                        }
                    }
                ]
            }
        ]
    });
    if (prior) {
        ctx.logger.info({ classId: current.classId }, '%s attributes to previous %s class', prior.class.course.name);
        await cl_models_1.AttributionModel.bulkCreate([
            {
                sourceId: prior.id,
                nextupId: args.id
            }
        ], {
            ignoreDuplicates: true
        });
    }
    return prior === null || prior === void 0 ? void 0 : prior.class;
}
exports.attributePurchase = attributePurchase;
async function runCronTask(_, args, ctx) {
    ctx.adminOnly();
    const fLogger = ctx.logger.child({ event: args.type });
    switch (args.type) {
        case 'DAILY_NEWS':
            await newsman_1.updateTechnews(fLogger, args.range);
            break;
        case 'CLEAN_STOCK':
            await cleaner_1.cleanStock(fLogger);
            break;
        case 'SCHEDULE_CLASSES':
            await planner_1.scheduleClasses(fLogger, args.ts);
            break;
    }
    return true;
}
exports.runCronTask = runCronTask;
