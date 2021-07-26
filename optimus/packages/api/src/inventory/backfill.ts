import { defaultTimezone, Topic, tzOpts } from 'cl-common';
import { ClassModel, CourseModel } from 'cl-models';
import { shuffle } from 'lodash';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import { getTeacherOccupancies } from '../lib/teacher-utils';
import { shiftConfig } from './schedule-config';
import { buildClass } from './schedule-generator';

export async function createBackupClass(
  current: ClassModel,
  course: CourseModel,
  logger: Logger
) {
  let backup: ClassModel;

  if (course.isTrial) {
    backup = await backfillTrialClass(current, course, logger);
  } else if (course.isRegular && course.level === 1) {
    backup = await backfillRegularClass(current, course, logger);
  }

  if (backup) {
    backup.details.createdBy = 'api:backfill';
    backup.details.reason = current.id;

    await backup.save();
    logger.info({ classId: backup.id }, 'class %s is backfilled', course.name);
  }

  return backup;
}

async function backfillTrialClass(
  current: ClassModel,
  course: CourseModel,
  logger: Logger
) {
  const now = DateTime.local().setZone(defaultTimezone);
  const ct = DateTime.fromJSDate(current.startDate, tzOpts);

  let cutoff = now.plus({ hours: 6 }); // by default starts
  if (now.get('hour') < shiftConfig.first[0]) {
    // early in the morning
    cutoff = now.set({ hour: 12 });
  } else if (now.get('hour') > shiftConfig.last[0]) {
    cutoff = now.plus({ day: 1 }).set({ hour: 12 });
  }

  if (ct < cutoff) {
    logger.info(
      'skip:: class started before cutoff time at %s',
      cutoff.toFormat('fff')
    );
    return;
  }

  const start = ct.startOf('day').toJSDate();
  const end = ct.endOf('day').toJSDate();
  const others = await ClassModel.scope('countStudent').findAll({
    where: {
      active: true,
      courseId: course.id,
      startDate: {
        [Op.gte]: start,
        [Op.lte]: end
      }
    },
    having: {
      numberOfRegistrations: {
        [Op.lt]: course.capacity
      }
    }
  });

  if (others.length > 2 || (course.subjectId !== Topic.SN && others.length > 1)) {
    logger.info('skip:: %d %s trials still available', others.length, course.name);
    return;
  }

  const occupancies = await getTeacherOccupancies(start, end, course.id);
  if (occupancies.length === 0) {
    return;
  }

  for (const shift of shuffle(shiftConfig.standard)) {
    const dt = ct.set({
      hour: shift[0],
      minute: shift[1],
      second: 0,
      millisecond: 0
    });

    if (dt < cutoff) {
      continue;
    }

    const backup = buildClass(dt, course);
    const candidate = occupancies.find(oc => oc.available(backup));
    if (candidate) {
      logger.info('found %s available', candidate.teacher.fullName);
      return backup;
    }
  }
}

async function backfillRegularClass(
  current: ClassModel,
  course: CourseModel,
  logger: Logger
) {
  const now = DateTime.local().setZone(defaultTimezone);
  const days = Math.ceil(
    now.diff(DateTime.fromJSDate(current.createdAt), 'days').days
  );

  logger.info('it took %d days to fill %s', days, course.name);

  const range = 5;
  const isCamp = await current.isCamp();

  const occupancies = await getTeacherOccupancies(
    now.plus({ days }).toJSDate(),
    now
      .plus({ days: days + range })
      .endOf('day')
      .toJSDate(),
    course.id
  );

  const ct = DateTime.fromJSDate(current.startDate, tzOpts);
  for (let i = 0; i < range; i++) {
    const dts = now
      .set({
        hour: ct.get('hour'),
        minute: ct.get('minute'),
        second: 0,
        millisecond: 0
      })
      .plus({ days: days + 1 });

    const backup = buildClass(dts, course, isCamp);

    const candidate = occupancies.find(oc => oc.available(backup));
    if (candidate) {
      logger.info(
        'found %s available at %s',
        candidate.teacher.fullName,
        dts.toFormat('ff')
      );
      return backup;
    } else {
      logger.info('not teacher available at %s', dts.toFormat('ff'));
    }
  }
}
