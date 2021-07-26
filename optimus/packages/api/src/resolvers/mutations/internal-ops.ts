import { Graphql } from '@cl/types';
import { CreditType, ReferralCredits, UnsubscribeGroups } from 'cl-common';
import {
  AttributionModel,
  ClassModel,
  CourseModel,
  EnrollmentModel,
  NoteModel,
  ProjectModel,
  StudentModel,
  TeacherModel,
  UserModel
} from 'cl-models';
import { Op } from 'sequelize';
import { GraphqlContext } from '../../graphql-handler';
import { createBackupClass } from '../../inventory/backfill';
import { bustConflicts } from '../../inventory/conflict-detector';
import { catalogStore } from '../../lib/dataloader';
import { ClassMaster, sendTemplatedEmail } from '../../lib/mailer';
import { createRecipient, createUserParams } from '../../lib/mailer-utils';
import { announcePurchase } from '../../lib/teacher-messages';
import { rewardTeacherToken, calculateWorkingHours } from '../../lib/teacher-utils';
import sequelize from '../../sequelize';

export async function issueCredit(
  root: any,
  args: Graphql.IssueCreditArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const user = await UserModel.findByPk(args.userId, {
    rejectOnEmpty: true
  });

  const credit = await user.createCredit({
    cents: args.cents,
    type: CreditType.Appeasement,
    details: {
      reason: args.reason,
      createdBy: ctx.identity
    }
  });

  ctx.logger.info('%s cents issued to the user', credit.cents);

  await sendTemplatedEmail({
    templateId: 'd-ed8cf22a14234d1e82047c673af01c6e',
    to: createRecipient(user),
    from: ClassMaster,
    customArgs: { amp_user_id: user.id },
    asm: { groupId: UnsubscribeGroups.Classes },
    dynamicTemplateData: {
      ...createUserParams(user),
      amount: credit.cents / 100,
      signupCredit: ReferralCredits.signup / 100
    }
  });

  return credit;
}

export async function backfillReferral(
  _,
  args: Graphql.BackfillReferralArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const user = await UserModel.findByPk(args.userId, {
    rejectOnEmpty: true
  });
  if (user.refererId) {
    ctx.badRequest(`${user.fullName} already has a referer`);
  }

  const referer = await UserModel.findOne({
    where: { email: args.refererEmail.toLowerCase().trim() }
  });
  if (!referer || referer.id === user.id) {
    ctx.badRequest(`${args.refererEmail} not a valid referer`);
  }

  const tx = await sequelize.transaction();
  try {
    await user.createCredit(
      {
        cents: ReferralCredits.signup,
        type: CreditType.Welcome,
        details: {
          reason: 'Referral bonus for new user',
          createdBy: ctx.identity,
          attribution: {
            userId: referer.id
          }
        }
      },
      {
        transaction: tx
      }
    );
    if (user.paid) {
      await referer.createCredit(
        {
          cents: ReferralCredits.purchase,
          type: CreditType.Purchase,
          details: {
            reason: `${user.fullName} has purchased a class`,
            createdBy: ctx.identity,
            attribution: {
              userId: user.id
            }
          }
        },
        {
          transaction: tx
        }
      );
    }
    if (user.attended) {
      await referer.createCredit(
        {
          cents: ReferralCredits.attendance,
          type: CreditType.Referral,
          details: {
            reason: `${user.fullName} has attended a class`,
            createdBy: ctx.identity,
            attribution: {
              userId: user.id
            }
          }
        },
        {
          transaction: tx
        }
      );
    }
    await user.setReferer(referer, {
      transaction: tx
    });

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return user;
}

export async function syncWorkingHours(_, args: any, ctx: GraphqlContext) {
  ctx.adminOnly();

  const teachers = await TeacherModel.findAll({
    where: {
      active: true
    }
  });

  const diff = teachers.map(t => ({
    t: t.id,
    email: t.email,
    details: {
      ...t.details,
      hours: calculateWorkingHours(t.availableTime, t.timezone)
    }
  }));

  return TeacherModel.bulkCreate(diff, {
    updateOnDuplicate: ['details']
  });
}

export async function mergeStudentRecords(
  _,
  args: { source: string; target: string },
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const source = await StudentModel.findByPk(args.source, {
    rejectOnEmpty: true,
    include: [EnrollmentModel, NoteModel, ProjectModel]
  });

  const target = await StudentModel.findByPk(args.target, {
    rejectOnEmpty: true
  });

  const tx = await sequelize.transaction();
  try {
    if (source.enrollments.length > 0) {
      const enrollmentIds = source.enrollments.map(en => en.id);
      ctx.logger.info('move enrollments %o to %s', enrollmentIds, target.name);

      await EnrollmentModel.update(
        { studentId: target.id },
        {
          transaction: tx,
          where: {
            id: { [Op.in]: enrollmentIds }
          }
        }
      );
    }

    if (source.projects.length > 0) {
      const projectIds = source.projects.map(en => en.id);
      ctx.logger.info('move projects %o to %s', projectIds, target.name);

      await ProjectModel.update(
        { studentId: target.id },
        {
          transaction: tx,
          where: {
            id: { [Op.in]: projectIds }
          }
        }
      );
    }

    if (source.notes.length > 0) {
      const noteIds = source.notes.map(en => en.id);
      ctx.logger.info('move notes %o to %s', noteIds, target.name);

      await NoteModel.update(
        { studentId: target.id },
        {
          transaction: tx,
          where: {
            id: { [Op.in]: noteIds }
          }
        }
      );
    }

    await source.destroy({ transaction: tx });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return target;
}

export async function takeDownConflicts(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const klass = await ClassModel.findByPk(args.id);
  if (klass) {
    await bustConflicts(klass);
    return true;
  }

  return false;
}

export async function createBackfill(_, args: Graphql.IdArgs, ctx: GraphqlContext) {
  ctx.adminOnly();

  const klass = await ClassModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [CourseModel]
  });

  return createBackupClass(
    klass,
    klass.course,
    ctx.logger.child({
      mutation: 'createBackfill',
      courseId: klass.courseId
    })
  );
}

export async function attributePurchase(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const current = await EnrollmentModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [ClassModel, StudentModel]
  });

  const course = await catalogStore.getCourseById(current.class.courseId);
  if (!course.isRegular) {
    return null;
  }

  const prior = await EnrollmentModel.findOne({
    order: [
      [ClassModel, CourseModel, 'level', 'DESC'],
      ['statusCode', 'DESC']
    ],
    where: {
      studentId: current.studentId
    },
    include: [
      {
        model: ClassModel.unscoped(),
        required: true,
        where: {
          startDate: {
            [Op.lt]: new Date()
          }
        },
        include: [
          {
            model: TeacherModel,
            required: true
          },
          {
            model: CourseModel,
            required: true,
            where: {
              subjectId: course.subjectId,
              level: {
                [Op.gte]: 0,
                [Op.lt]: course.level
              }
            }
          }
        ]
      }
    ]
  });

  if (!prior) {
    return;
  }

  const tx = await sequelize.transaction();
  try {
    const result = await AttributionModel.findOrCreate({
      transaction: tx,
      where: {
        sourceId: prior.id,
        nextupId: args.id
      },
      defaults: {
        sourceId: prior.id,
        nextupId: args.id
      }
    });

    if (result[1]) {
      ctx.logger.info(
        { classId: current.classId },
        '%s attributes to previous %s class',
        course.name,
        prior.class.course.name
      );

      if (prior.class.course.isTrial && course.level === 1) {
        await rewardTeacherToken(prior.class, tx, ctx.logger);
      }
    }

    await tx.commit();
  } catch (err) {
    ctx.logger.error(err, 'attribution failed');
    await tx.rollback();
    throw err;
  }

  await announcePurchase(
    prior.class.teacher,
    current.student,
    current.class,
    course
  );

  return prior.class;
}
