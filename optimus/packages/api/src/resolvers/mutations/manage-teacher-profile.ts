import { Graphql } from '@cl/types';
import { defaultTimezone } from 'cl-common';
import {
  StudentModel,
  TeacherCourseModel,
  TeacherModel,
  TimeoffModel,
  UserModel
} from 'cl-models';
import { parsePhoneNumberFromString } from 'libphonenumber-js/mobile';
import { last, pick } from 'lodash';
import { IANAZone } from 'luxon';
import { Transaction } from 'sequelize';
import { GraphqlContext } from '../../graphql-handler';
import { teacherStore } from '../../lib/dataloader';
import { uploadAvatar } from '../../lib/s3-utils';
import { alertScheduleChanges } from '../../lib/teacher-messages';
import { calculateWorkingHours } from '../../lib/teacher-utils';
import sequelize from '../../sequelize';

export async function createTeacher(
  _,
  args: Graphql.CreateTeacherVars,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const tx = await sequelize.transaction();
  const email = args.email.toLowerCase().trim();

  try {
    const [user] = await UserModel.findOrCreate({
      transaction: tx,
      where: { email },
      defaults: {
        email: args.email,
        password: args.password.trim(),
        firstName: args.firstName,
        lastName: args.lastName,
        details: {
          timezone: defaultTimezone,
          source: 'teacher'
        }
      }
    });

    const teacher = await TeacherModel.create(
      {
        email,
        userId: user.id,
        firstName: args.firstName,
        lastName: args.lastName,
        details: {
          timezone: user.timezone
        }
      },
      { transaction: tx }
    );

    if (args.capabilities?.length > 0) {
      await setCapabilities(teacher, args, tx);
    }

    await user.setTeacher(teacher, {
      transaction: tx
    });

    await StudentModel.create(
      {
        name: user.firstName,
        parentId: user.id
      },
      { transaction: tx }
    );

    await tx.commit();

    teacherStore.update(teacher);
    ctx.logger.info(
      { teacherId: teacher.id },
      'teacher %s created',
      teacher.fullName
    );

    return teacher;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function removeTeacher(_, args: Graphql.IdArgs, ctx: GraphqlContext) {
  ctx.adminOnly();

  const teacher = await TeacherModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [UserModel]
  });

  const tx = await sequelize.transaction();
  try {
    if (teacher.user) {
      await teacher.user.setTeacher(null, {
        transaction: tx
      });
    }

    await teacher.destroy({ transaction: tx });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  teacherStore.delete(teacher.id);
  return true;
}

export async function editTeacherProfile(
  _,
  args: Graphql.EditTeacherVars,
  ctx: GraphqlContext
) {
  ctx.ownerOrInternal(args.id);

  ctx.logger.info({ args, mutation: 'editTeacherProfile' });

  const teacher = await TeacherModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [TeacherCourseModel]
  });

  const details = {
    ...teacher.details,
    ...pick(args, ['bio', 'experiences'])
  };

  if (args.phoneNumber) {
    const phoneNumber = parsePhoneNumberFromString(args.phoneNumber, 'US');
    if (phoneNumber && phoneNumber.isValid) {
      teacher.set('phoneNumber', phoneNumber.number);
    } else {
      ctx.badRequest('Not a valid mobile number', args);
    }
  }

  if (
    args.timezone &&
    args.timezone !== teacher.timezone &&
    IANAZone.isValidZone(args.timezone)
  ) {
    details.timezone = args.timezone;
    details.hours = calculateWorkingHours(teacher.availableTime, args.timezone);
  }

  if (args.avatar) {
    const fileName = teacher.fullName + '_' + Date.now();
    const uploadResult = await uploadAvatar(fileName, args.avatar.content);
    details.avatar = uploadResult.resultURL;
  }

  const tx = await sequelize.transaction();

  try {
    await teacher.update(
      {
        details,
        firstName: args.firstName || teacher.firstName,
        lastName: args.lastName || teacher.lastName
      },
      { transaction: tx }
    );
    if (ctx.isAdmin) {
      await setCapabilities(teacher, args, tx);
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  ctx.logger.info(
    { teacherId: args.id, mutation: 'editTeacherProfile' },
    '%s profile updated',
    teacher.fullName
  );

  teacherStore.update(teacher);

  return teacher;
}

async function setCapabilities(
  teacher: TeacherModel,
  args: Pick<Graphql.CreateTeacherVars, 'capabilities'>,
  tx: Transaction
) {
  if (!args.capabilities) {
    return;
  }

  await TeacherCourseModel.destroy({
    where: { teacherId: teacher.id },
    transaction: tx
  });

  const items = args.capabilities.map(capability => ({
    teacherId: teacher.id,
    courseId: capability.courseId,
    priority: capability.priority
  }));

  if (items.length > 0) {
    await TeacherCourseModel.bulkCreate(items, {
      updateOnDuplicate: ['priority'],
      transaction: tx
    });
  }
}

export async function setTeacherTimeOff(
  _,
  args: Graphql.AddTeacherTimeOffVars,
  ctx: GraphqlContext
) {
  ctx.ownerOrAdmin(args.teacherId);

  await TimeoffModel.create({
    teacherId: args.teacherId,
    start: args.start,
    end: args.end
  });

  return TeacherModel.findByPk(args.teacherId, {
    include: [TimeoffModel]
  });
}

export async function updateTeacherTimeOff(
  _,
  args: Graphql.UpdateTeacherTimeOffVars,
  ctx: GraphqlContext
) {
  const timeOff = await TimeoffModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  ctx.ownerOrAdmin(timeOff.teacherId);
  await timeOff.update({ start: args.start, end: args.end });
  return timeOff;
}

export async function removeTeacherTimeOff(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  const timeOff = await TimeoffModel.findByPk(args.id, {
    rejectOnEmpty: true
  });
  ctx.ownerOrAdmin(timeOff.teacherId);

  await timeOff.destroy();

  return TeacherModel.findByPk(timeOff.teacherId, {
    include: [TimeoffModel]
  });
}

export async function updateTeacherAvailability(
  _,
  args: Graphql.UpdateTeacherAvailabilitiesVars,
  ctx: GraphqlContext
) {
  ctx.ownerOrAdmin(args.teacherId);

  const teacher = await TeacherModel.findByPk(args.teacherId, {
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
        if (acc.length === 0) return [value];
        const lastInterval = last(acc);
        if (value[0] - lastInterval[1] <= 0) {
          return [...acc.slice(0, -1), [lastInterval[0], value[1]]];
        } else {
          return [...acc, value];
        }
      }, [])
  }));

  const previous = teacher.hours;
  await teacher.update({
    'details.availableTime': availableTime,
    'details.hours': calculateWorkingHours(availableTime, teacher.timezone)
  });

  ctx.logger.info(
    { teacherId: teacher.id, args, hours: teacher.hours },
    'working schedule updated'
  );

  if (Math.abs(teacher.hours - previous) > 10) {
    await alertScheduleChanges(teacher, previous);
  }

  teacherStore.update(teacher);
  return teacher;
}
