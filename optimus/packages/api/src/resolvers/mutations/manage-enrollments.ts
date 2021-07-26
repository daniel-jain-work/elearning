import { Graphql } from '@cl/types';
import { TransactionOperation } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  EnrollmentModel,
  MoverModel,
  SessionModel,
  StudentModel,
  TransactionModel
} from 'cl-models';
import { Op } from 'sequelize';
import { GraphqlContext } from '../../graphql-handler';
import { refund } from '../../lib/braintree';
import { emitClassEnrolledEvent } from '../../lib/cloudwatch';
import { sendAddonConfirmation } from '../../lib/enrollment-emails';
import sequelize from '../../sequelize';

// let admin enroll a student to any class easily
export async function addStudentToClass(
  _,
  args: Graphql.AddStudentToClassArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const student = await StudentModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  const tx = await sequelize.transaction();
  try {
    const er = await EnrollmentModel.create(
      {
        classId: args.classId,
        studentId: student.id,
        source: args.source || ctx.identity,
        campaign: args.campaign || 'ops'
      },
      {
        transaction: tx
      }
    );

    if (args.amount > 0) {
      const sale = await TransactionModel.create(
        {
          details: {
            id: er.id,
            type: TransactionOperation.Sale,
            amount: args.amount.toFixed(2),
            source: er.source,
            campaign: er.campaign,
            status: 'backfill'
          }
        },
        { transaction: tx }
      );

      await sale.addEnrollments([er.id], {
        transaction: tx
      });
    }

    await tx.commit();

    ctx.logger.info(
      {
        classId: args.classId,
        userId: student.parentId,
        mutation: 'addStudentToClass'
      },
      '%s added to class',
      student.name
    );

    await emitClassEnrolledEvent({
      id: er.id,
      classId: args.classId
    });

    return er;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function rescheduleRegistration(
  _,
  args: Graphql.RescheduleRegistrationArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const er = await EnrollmentModel.findByPk(args.id, {
    include: [StudentModel],
    rejectOnEmpty: true
  });
  const klass = await ClassModel.findByPk(args.classId, {
    rejectOnEmpty: true
  });

  const tx = await sequelize.transaction();
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
  } catch (err) {
    await tx.rollback();
    throw er;
  }

  await emitClassEnrolledEvent({
    id: er.id,
    classId: args.classId,
    isReschedule: true
  });

  return er;
}

export async function refundPurchase(
  _,
  args: Graphql.RefundPurchaseArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const purchase = await TransactionModel.findByPk(args.transactionId, {
    rejectOnEmpty: true,
    include: [
      {
        model: EnrollmentModel,
        required: true
      }
    ]
  });

  if (args.amount <= 0 || args.amount > purchase.amount) {
    ctx.badRequest(
      `Cannot refund more than originally paid: ${purchase.amount}`,
      args
    );
  }

  const logger = ctx.logger.child({
    mutation: 'refundPurchase',
    transactionId: args.transactionId
  });

  const tx = await sequelize.transaction();
  try {
    const refundDetails = await refund(purchase.details.id, logger, args.amount);

    const creditTransaction = await TransactionModel.create(
      { details: refundDetails },
      { transaction: tx }
    );

    logger.info('%s refund issued', creditTransaction.amount);

    await creditTransaction.addEnrollments(purchase.enrollments, {
      transaction: tx
    });

    if (args.enrollmentIds && args.enrollmentIds.length > 0) {
      await EnrollmentModel.destroy({
        where: {
          id: {
            [Op.in]: args.enrollmentIds
          }
        },
        transaction: tx
      });
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return args.enrollmentIds.length;
}

export async function cancelRegistration(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const er = await EnrollmentModel.findByPk(args.id, {
    include: [StudentModel.unscoped(), TransactionModel],
    rejectOnEmpty: true
  });

  if (er.transactions.length > 0) {
    ctx.badRequest('Use RefundPurchase to handle cancelling of paid registraions');
  }

  await er.destroy({ force: true });

  ctx.logger.info(
    {
      mutation: 'cancelRegistration',
      classId: er.classId,
      userId: er.student.parentId
    },
    'class canceled for %s',
    er.student.name
  );

  return true;
}

export async function removeStudentFromSession(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();
  await MoverModel.destroy({
    where: {
      id: args.id
    }
  });
  return args.id;
}

export async function addStudentToSession(
  _,
  args: Graphql.AddStudentToSessionArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const enrollment = await EnrollmentModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [StudentModel]
  });

  const session = await SessionModel.findByPk(args.sessionId, {
    rejectOnEmpty: true,
    include: [
      {
        model: ClassModel,
        include: [CourseModel]
      }
    ]
  });

  let addon: MoverModel;

  const tx = await sequelize.transaction();

  // only 1 addon for the same session
  try {
    addon = await enrollment.addToSession(session, tx);
    await tx.commit();
    ctx.logger.info(
      { classId: session.classId, userId: enrollment.student.parentId },
      'student %s added to class %s',
      enrollment.student.name,
      session.class.courseId
    );
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  addon.class = session.class;
  addon.student = enrollment.student;
  await sendAddonConfirmation(
    addon.student,
    addon.class,
    session.class.course,
    addon.idx
  );
  return addon;
}
