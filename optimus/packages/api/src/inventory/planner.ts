import { defaultTimezone } from 'cl-common';
import { ClassModel, CourseModel, SessionModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { getTeacherOccupancies } from '../lib/teacher-utils';
import { paidSchedules, shiftConfig, trialSchedules } from './schedule-config';
import {
  buildCamps,
  buildClass,
  duplicatePastCamps,
  getPreschedules
} from './schedule-generator';

// in production, ran previous night
export async function scheduleClasses(dt: DateTime, logger: Logger) {
  const planned = [
    ...(await getPreschedules(dt.plus({ day: 2 }), trialSchedules, logger)),
    ...(await getPreschedules(dt.plus({ day: 3 }), trialSchedules, logger)),
    ...(await getPreschedules(dt.plus({ days: 7 }), trialSchedules, logger)),
    ...(await getPreschedules(dt.plus({ week: 3 }), paidSchedules, logger)),
    ...(await duplicatePastCamps(dt, logger))
  ];

  if (planned.length === 0) {
    return;
  }

  let latest = dt.toJSDate();
  planned.forEach(p => {
    if (p.endDate > latest) {
      latest = p.endDate;
    }
  });

  const occupancies = await getTeacherOccupancies(dt.toJSDate(), latest);
  const dataItems: Record<string, any>[] = [];

  for (const k of planned) {
    const candidates: string[] = [];
    for (const oc of occupancies) {
      if (oc.available(k)) {
        candidates.push(oc.teacher.firstName);
      }
    }

    if (candidates.length === 0) {
      logger.warn('no teacher available to teach %s', k.courseId);
      continue;
    }

    const existing = await ClassModel.count({
      where: {
        courseId: k.courseId,
        startDate: k.startDate
      }
    });

    if (existing > 0) {
      logger.warn('class %s is created already', k.courseId);
      continue;
    }

    k.details.createdBy = 'api:scheduler';
    dataItems.push(k.toJSON());
  }

  if (dataItems.length > 0) {
    const klasses = await ClassModel.bulkCreate(dataItems, {
      include: [SessionModel]
    });

    for (const k of klasses) {
      logger.info({ classId: k.id }, 'class prescheduled');
    }
  }

  return dataItems;
}

export function proposeSchedules(course: CourseModel, dt: DateTime, range: number) {
  const candidates: ClassModel[] = [];

  if (course.official) {
    let cur = dt.setZone(defaultTimezone).startOf('day');

    for (let i = 0; i < range; i++) {
      cur = cur.plus({ day: 1 });

      shiftConfig.standard.forEach(shift => {
        const classTime = cur.set({
          hour: shift[0],
          minute: shift[1],
          second: 0,
          millisecond: 0
        });

        if (classTime > dt) {
          if (course.isTrial) {
            candidates.push(buildClass(classTime, course));
          } else {
            candidates.push(...buildCamps(classTime, course));
          }
        }
      });
    }
  }

  return candidates;
}
