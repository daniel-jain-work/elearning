import { Graphql } from '@cl/types';
import { UserInputError } from 'apollo-server-express';
import { tzOpts, UnsubscribeGroups } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  MoverModel,
  NoteModel,
  SessionModel,
  TeacherModel,
  ZoomhostModel
} from 'cl-models';
import { isEqual, last, omit } from 'lodash';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import { GraphqlContext } from '../../graphql-handler';
import { bustConflicts } from '../../inventory/conflict-detector';
import {
  assertCanEditClass,
  assertCanCreateClass,
  assertSchedulesValid
} from '../../lib/class-validator';
import { emitClassCreatedEvent, emitClassUpdatedEvent } from '../../lib/cloudwatch';
import { deleteEvent, updateEvent, upsertEvent } from '../../lib/google-calendar';
import { isHostAvailable } from '../../lib/host-manager';
import { ClassMaster, sendTemplatedEmail } from '../../lib/mailer';
import { createClassParams } from '../../lib/mailer-utils';
import {
  announceAssignment,
  sendAlertToReassignTeacher
} from '../../lib/teacher-messages';
import {
  findAndVerifyTeacher,
  suggestBestFit,
  useTrialToken
} from '../../lib/teacher-utils';
import sequelize from '../../sequelize';
import {
  createMeeting,
  deleteMeeting,
  parseZoomLink,
  updateMeeting
} from '../../zoomtopia/zoom-api';
import { createNote } from './manage-notes';

export async function upsertZoomMeeting(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const fLogger = ctx.logger.child({
    classId: args.id,
    mutation: 'upsertZoomMeeting'
  });

  const klass = await ClassModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [CourseModel, TeacherModel, ZoomhostModel]
  });

  if (klass.zoomId && klass.zoomhostId) {
    await updateMeeting(klass, klass.course, fLogger);
  } else if (!klass.dialInLink) {
    const meeting = await createMeeting(klass, klass.course, fLogger);
    if (meeting) {
      await upsertEvent(klass, klass.course, fLogger);
    }
  }

  return klass;
}

export async function deleteZoomMeeting(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const fLogger = ctx.logger.child({
    classId: args.id,
    mutation: 'deleteZoomMeeting'
  });

  const klass = await ClassModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [CourseModel, TeacherModel]
  });

  if (klass.zoomId) {
    await deleteMeeting(klass, fLogger);
    await updateEvent(klass, klass.course, fLogger);
    await klass.update({
      zoomhostId: null,
      details: omit(klass.details, 'dialInLink', 'zoomId', 'password')
    });
  }

  return klass;
}

export async function upsertCalendarEvent(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const fLogger = ctx.logger.child({
    classId: args.id,
    mutation: 'upsertCalendarEvent'
  });

  const klass = await ClassModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [CourseModel, TeacherModel, ZoomhostModel]
  });

  await upsertEvent(klass, klass.course, fLogger);
  return klass;
}

export async function updateClassStatus(
  _,
  args: Graphql.UpdateClassStatusArgs,
  ctx: GraphqlContext
) {
  const klass = await ClassModel.scope(['defaultScope', 'countStudent']).findByPk(
    args.id,
    {
      rejectOnEmpty: true,
      include: [CourseModel, TeacherModel, ZoomhostModel]
    }
  );

  await assertCanEditClass(klass, ctx);

  const logger = ctx.logger.child({
    classId: args.id,
    mutation: 'updateClassStatus'
  });

  await klass.update({ active: args.active });
  logger.info('class status changed to %s', args.active);

  if (args.active) {
    await upsertEvent(klass, klass.course, logger);
    return klass;
  }

  if (klass.numberOfRegistrations === 0) {
    await deleteMeeting(klass, logger);
    await deleteEvent(klass, logger);
    await klass.update({
      zoomhostId: null,
      details: omit(klass.details, 'eventId', 'dialInLink', 'zoomId', 'password')
    });
  }

  return klass;
}

export async function removeTeacherFromClass(
  _,
  args: Graphql.ClassIdArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const klass = await ClassModel.findByPk(args.classId, {
    rejectOnEmpty: true,
    include: [CourseModel]
  });

  const logger = ctx.logger.child({
    classId: klass.id,
    teacherId: klass.teacherId,
    mutation: 'removeTeacherFromClass'
  });

  if (!klass.teacherId) {
    logger.warn('No teacher is assigned to class');
    return;
  }

  const tx = await sequelize.transaction();
  try {
    await klass.setTeacher(null, { transaction: tx });
    await createNote(
      {
        classId: klass.id,
        content: 'Teacher is removed from class'
      },
      ctx,
      tx
    );
    await tx.commit();
  } catch (err) {
    logger.error(err);
    await tx.rollback();
    throw err;
  }

  logger.info('teacher is removed from class');
  await updateEvent(klass, klass.course, logger);

  return klass;
}

export async function setClassObservers(
  _,
  args: Graphql.SetClassObserversArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const klass = await ClassModel.findByPk(args.classId, {
    include: [CourseModel]
  });

  await klass.setObservers(args.teacherIds);
  klass.observers = await klass.getObservers();
  ctx.logger.info(
    { classId: args.classId },
    'class has %d observers',
    klass.observers.length
  );

  if (klass.observers.length > 0) {
    const startTime = DateTime.fromJSDate(klass.startDate, tzOpts).toFormat('ffff');
    await sendTemplatedEmail({
      from: ClassMaster,
      templateId: 'd-1fda1e3af655445e9fe7073265a53e5d',
      asm: { groupId: UnsubscribeGroups.Classes },
      personalizations: klass.observers.map(t => ({
        to: t.email,
        dynamicTemplateData: {
          startTime,
          ...createClassParams(klass, klass.course),
          teacher_name: t.firstName
        }
      }))
    });
  }

  return klass;
}

export async function autoAssignTeacher(
  _,
  args: Graphql.AutoAssignTeacherArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const klass = await ClassModel.findByPk(args.classId, {
    rejectOnEmpty: true,
    include: [CourseModel]
  });

  if (klass.teacherId) {
    return;
  }

  const logger = ctx.logger.child({
    classId: klass.id,
    mutation: 'autoAssignTeacher'
  });

  let teacher: TeacherModel;
  if (args.hintId) {
    const result = await findAndVerifyTeacher(args.hintId, klass);
    if (!result.error) {
      teacher = result.teacher;
      logger.info('preferered teacher %s is available', teacher.fullName);
    }
  }

  if (!teacher) {
    teacher = await suggestBestFit(klass, klass.course, logger);
  }

  if (teacher) {
    const tx = await sequelize.transaction();
    try {
      await klass.setTeacher(teacher, { transaction: tx });
      await useTrialToken(teacher, klass.course, tx, logger);
      await createNote(
        {
          classId: klass.id,
          content: `Class is assigned to ${teacher.fullName} automatically`
        },
        ctx,
        tx
      );

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

    await announceAssignment(teacher, klass, logger);
    await upsertEvent(klass, klass.course, logger);
    await bustConflicts(klass);
  }

  return teacher;
}

export async function updateClass(
  _,
  args: Graphql.UpdateClassVars,
  ctx: GraphqlContext
) {
  const logger = ctx.logger.child({
    classId: args.id,
    mutation: 'updateClass'
  });

  const klass = await ClassModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [CourseModel, { model: MoverModel, as: 'addons' }]
  });

  await assertCanEditClass(klass, ctx);

  let scheduleChanged = false;
  let teacherChanged = false;

  if (args.schedules) {
    assertSchedulesValid(args.schedules, ctx);
    scheduleChanged = !isEqual(klass.schedules, args.schedules);
    if (scheduleChanged && !args.skipVerification && klass.addons.length > 0) {
      ctx.badRequest('Addon students on will be affected by the schedules changes');
    }
  }

  if (args.dialInLink && args.dialInLink !== klass.dialInLink) {
    klass.set('zoomhostId', null);
    klass.set('details', {
      ...klass.details,
      ...parseZoomLink(args.dialInLink)
    });
  }

  if (args.teacherId) {
    if (args.teacherId !== klass.teacherId) {
      klass.set('teacherId', args.teacherId);
      teacherChanged = true;
    }
  } else if (klass.teacherId) {
    klass.set('teacherId', null);
    teacherChanged = true;
  }

  logger.info({ args, teacherChanged, scheduleChanged });

  const tx = await sequelize.transaction();

  try {
    if (scheduleChanged) {
      const sessions = args.schedules.map((schedule, idx) => {
        const session =
          klass.sessions[idx] ||
          new SessionModel({
            classId: klass.id,
            idx
          });

        session.set('startDate', schedule[0]);
        session.set('endDate', schedule[1]);
        return session;
      });

      if (sessions.length < klass.sessions.length) {
        const idsToRemove = klass.sessions.slice(sessions.length).map(ses => ses.id);
        await SessionModel.destroy({
          transaction: tx,
          where: {
            id: {
              [Op.in]: idsToRemove
            }
          }
        });
      }

      await SessionModel.bulkCreate(
        sessions.map(ses => ses.toJSON()),
        {
          transaction: tx,
          updateOnDuplicate: ['startDate', 'endDate']
        }
      );

      await createNote(
        {
          classId: klass.id,
          content: 'Class schedules updated'
        },
        ctx,
        tx
      );

      klass.set('sessions', sessions);
      klass.set('startDate', sessions[0].startDate);
      klass.set('endDate', last(sessions).endDate);
    }

    if (klass.teacherId) {
      klass.teacher = await getTeacherIfAvailable(
        klass.teacherId,
        klass,
        args.skipVerification,
        logger
      );

      if (teacherChanged) {
        await useTrialToken(klass.teacher, klass.course, tx, logger);
        await createNote(
          {
            classId: klass.id,
            content: `Class is assigned to ${klass.teacher.fullName}`
          },
          ctx,
          tx
        );
      }
    }

    if (scheduleChanged && klass.zoomhostId) {
      const stillAvailable = await isHostAvailable(klass);
      if (!stillAvailable) {
        await deleteMeeting(klass, logger);
        klass.set('zoomhostId', null);
        klass.set('details', {
          ...omit(klass.details, 'zoomId', 'dialInLink', 'password')
        });
      }
    }

    await klass.save({ transaction: tx });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  if (klass.teacher && teacherChanged) {
    await announceAssignment(klass.teacher, klass, logger);
  }

  await emitClassUpdatedEvent({
    classId: klass.id,
    teacherChanged,
    scheduleChanged
  });

  return klass;
}

export async function createClass(
  _,
  args: Graphql.CreateClassVars,
  ctx: GraphqlContext
) {
  assertCanCreateClass(args, ctx);
  assertSchedulesValid(args.schedules, ctx);

  const sessions = args.schedules.map((session, idx) => ({
    idx,
    startDate: session[0],
    endDate: session[1]
  }));

  const zoomProps = args.dialInLink ? parseZoomLink(args.dialInLink) : null;
  const klass = new ClassModel(
    {
      active: args.active,
      courseId: args.courseId,
      details: {
        createdBy: ctx.identity,
        ...zoomProps
      },
      notes: args.note ? [{ content: args.note }] : [],
      startDate: sessions[0].startDate,
      endDate: sessions[sessions.length - 1].endDate,
      sessions
    },
    {
      include: [NoteModel, SessionModel]
    }
  );

  const logger = ctx.logger.child({ classId: klass.id, mutation: 'createClass' });

  if (args.teacherId) {
    klass.teacherId = args.teacherId;
    klass.teacher = await getTeacherIfAvailable(
      args.teacherId,
      klass,
      args.skipVerification,
      logger
    );
  }

  await klass.save();
  logger.info({ payload: args }, 'class created');
  if (klass.teacher) {
    await announceAssignment(klass.teacher, klass, logger);
  }

  await emitClassCreatedEvent({
    classId: klass.id
  });

  return klass;
}

export async function requestReassign(
  _,
  args: Graphql.RequestReassignArgs,
  ctx: GraphqlContext
) {
  const klass = await ClassModel.findByPk(args.classId, {
    rejectOnEmpty: true,
    include: [
      CourseModel,
      {
        model: TeacherModel,
        required: true
      }
    ]
  });

  ctx.ownerOrAdmin(klass.teacherId);

  const logger = ctx.logger.child({
    classId: klass.id,
    mutation: 'requestReassign'
  });

  await sendAlertToReassignTeacher(klass, klass.teacher);
  const teacher = await suggestBestFit(klass, klass.course, logger);

  const tx = await sequelize.transaction();

  try {
    await createNote(
      {
        classId: klass.id,
        content: args.reason || 'Requested to reassign class'
      },
      ctx,
      tx
    );

    if (teacher) {
      await klass.setTeacher(teacher, { transaction: tx });
      await useTrialToken(teacher, klass.course, tx, logger);
      await createNote(
        {
          classId: klass.id,
          content: `Class is auto assigned to ${teacher.fullName}`
        },
        ctx,
        tx
      );
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  klass.teacher = teacher;
  if (teacher) {
    await announceAssignment(teacher, klass, logger);
  }

  return klass;
}

async function getTeacherIfAvailable(
  teacherId: string,
  klass: ClassModel,
  skipVerification: boolean,
  logger: Logger
) {
  if (skipVerification) {
    return TeacherModel.findByPk(teacherId, {
      rejectOnEmpty: true
    });
  }

  const result = await findAndVerifyTeacher(teacherId, klass);
  if (result.error) {
    logger.warn({ teacherId }, result.error);
    throw new UserInputError(result.error, {
      teacherId
    });
  }

  return result.teacher;
}
