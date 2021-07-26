"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStudentToSession = exports.removeStudentFromSession = exports.cancelRegistration = exports.partialRefund = exports.rescheduleRegistration = exports.addStudentToClass = void 0;
const cl_models_1 = require("cl-models");
const lodash_1 = require("lodash");
const braintree_1 = require("../../lib/braintree");
const cloudwatch_1 = require("../../lib/cloudwatch");
const enrollment_emails_1 = require("../../lib/enrollment-emails");
const sequelize_1 = require("../../sequelize");
// let admin enroll a student to any class easily
async function addStudentToClass(_, args, ctx) {
    ctx.internalOnly();
    const student = await cl_models_1.StudentModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    const er = await cl_models_1.EnrollmentModel.create({
        classId: args.classId,
        studentId: student.id,
        source: ctx.identity,
        campaign: 'internal'
    });
    ctx.logger.info({ classId: er.classId, userId: student.parentId }, '%s added to class', student.name);
    if (er) {
        await cloudwatch_1.emitClassEnrolledEvent({
            id: er.id,
            classId: args.classId
        });
    }
    return er;
}
exports.addStudentToClass = addStudentToClass;
async function rescheduleRegistration(_, args, ctx) {
    ctx.internalOnly();
    const er = await cl_models_1.EnrollmentModel.findByPk(args.id, {
        include: [cl_models_1.StudentModel],
        rejectOnEmpty: true
    });
    const klass = await cl_models_1.ClassModel.findByPk(args.classId, {
        rejectOnEmpty: true
    });
    const tx = await sequelize_1.default.transaction();
    const fLogger = ctx.logger.child({
        mutation: 'rescheduleRegistration',
        userId: er.student.parentId
    });
    try {
        fLogger.info({ classId: er.classId }, '%s is removed', er.student.name);
        fLogger.info({ classId: klass.id }, '%s is added', er.student.name);
        await er.reschedule(klass, 'ops', tx);
        await tx.commit();
        er.class = klass;
    }
    catch (err) {
        await tx.rollback();
        throw er;
    }
    await cloudwatch_1.emitClassEnrolledEvent({
        id: er.id,
        classId: args.classId,
        isReschedule: true
    });
    return er;
}
exports.rescheduleRegistration = rescheduleRegistration;
async function partialRefund(_, args, ctx) {
    ctx.internalOnly();
    const er = await cl_models_1.EnrollmentModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [
            cl_models_1.StudentModel,
            {
                model: cl_models_1.TransactionModel,
                include: [cl_models_1.EnrollmentModel]
            }
        ]
    });
    if (lodash_1.isEmpty(er.transactions) ||
        er.transactions.length > 1 ||
        er.transactions[0].type !== cl_models_1.TransactionOperation.Sale) {
        ctx.badRequest('No refund available or already refunded');
    }
    const saleTransaction = er.transactions[0];
    if (args.amount < 1 || args.amount >= saleTransaction.amount) {
        ctx.badRequest(`You can only refund between $1 and $${saleTransaction.amount}`);
    }
    const fLogger = ctx.logger.child({
        mutation: 'partialRefund',
        classId: er.classId,
        userId: er.student.parentId
    });
    const tx = await sequelize_1.default.transaction();
    try {
        const refundDetails = await braintree_1.refund(saleTransaction.details.id, fLogger, args.amount);
        const creditTransaction = await cl_models_1.TransactionModel.create({ details: refundDetails }, { transaction: tx });
        await creditTransaction.addEnrollments(saleTransaction.enrollments, {
            transaction: tx
        });
        fLogger.info('issued $%d refund to %s', saleTransaction.amount, er.student.name);
        await tx.commit();
        return args.id;
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
}
exports.partialRefund = partialRefund;
async function cancelRegistration(_, args, ctx) {
    ctx.internalOnly();
    const er = await cl_models_1.EnrollmentModel.findByPk(args.id, {
        include: [cl_models_1.StudentModel.unscoped(), cl_models_1.TransactionModel],
        rejectOnEmpty: true
    });
    const fLogger = ctx.logger.child({
        mutation: 'cancelRegistration',
        classId: er.classId,
        userId: er.student.parentId
    });
    if (er.transactions.length === 0) {
        await er.destroy({ force: true });
        fLogger.info('enrollment canceled for %s', er.student.name);
        return true;
    }
    const saleTransaction = er.transactions[0];
    if (er.transactions.length > 1 ||
        saleTransaction.type !== cl_models_1.TransactionOperation.Sale) {
        ctx.badRequest('No refund available or already refunded');
    }
    // there can be multiple enrollments per transaction
    const enrollments = await saleTransaction.getEnrollments();
    const tx = await sequelize_1.default.transaction();
    try {
        await Promise.all(enrollments.map(er => er.destroy({ transaction: tx })));
        const refundDetails = await braintree_1.refund(saleTransaction.details.id, fLogger);
        await cl_models_1.TransactionModel.create({ details: refundDetails }, { transaction: tx });
        fLogger.info('canceled enrollment and refunded $%d for %s', saleTransaction.amount, er.student.name);
        await tx.commit();
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    return true;
}
exports.cancelRegistration = cancelRegistration;
async function removeStudentFromSession(_, args, ctx) {
    ctx.internalOnly();
    await cl_models_1.MoverModel.destroy({
        where: {
            id: args.id
        }
    });
    return args.id;
}
exports.removeStudentFromSession = removeStudentFromSession;
async function addStudentToSession(_, args, ctx) {
    ctx.internalOnly();
    const enrollment = await cl_models_1.EnrollmentModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.StudentModel]
    });
    const session = await cl_models_1.SessionModel.findByPk(args.sessionId, {
        rejectOnEmpty: true,
        include: [
            {
                model: cl_models_1.ClassModel,
                include: [cl_models_1.CourseModel]
            }
        ]
    });
    let addon;
    const tx = await sequelize_1.default.transaction();
    // only 1 addon for the same session
    try {
        addon = await enrollment.addToSession(session, tx);
        await tx.commit();
        ctx.logger.info({ classId: session.classId, userId: enrollment.student.parentId }, 'student %s added to class %s', enrollment.student.name, session.class.courseId);
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    addon.class = session.class;
    addon.student = enrollment.student;
    await enrollment_emails_1.sendAddonConfirmation(addon.student, addon.class, session.class.course, addon.idx);
    return addon;
}
exports.addStudentToSession = addStudentToSession;
