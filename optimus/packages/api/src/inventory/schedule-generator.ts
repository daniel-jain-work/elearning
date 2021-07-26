import { campClassMaxDays } from 'cl-common';
import { ClassModel, CourseModel, SessionModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import { catalogStore } from '../lib/dataloader';
import {
  holidays,
  ScheduleDefs,
  ScheduleOption,
  campPatterns
} from './schedule-config';

export const startOfTime = DateTime.fromISO('2019-06-01T12:00:00.000Z');
export const regularClassLength = 4;

export function isHoliday(dt: DateTime): boolean {
  return holidays.includes(dt.toISODate());
}

export function isRightWeek(schedule: ScheduleOption, dt: DateTime) {
  if (schedule.weekday !== dt.weekday) {
    return false;
  }
  const offset = Math.floor(dt.diff(startOfTime, 'weeks').weeks) % schedule.interval;
  return schedule.offset >= 0 ? schedule.offset === offset : offset === 0;
}

// skip holidays
export function getNextWeek(ts: DateTime) {
  let next = ts.plus({ week: 1 });
  while (isHoliday(next)) {
    next = next.plus({ week: 1 });
  }
  return next;
}

export async function duplicatePastCamps(dt: DateTime, logger: Logger) {
  const klasses = await ClassModel.scope(['defaultScope', 'countStudent']).findAll({
    where: {
      days: {
        [Op.lt]: campClassMaxDays
      },
      startDate: {
        [Op.gte]: dt.startOf('day').toJSDate(),
        [Op.lte]: dt.endOf('day').toJSDate()
      }
    },
    include: [
      {
        model: CourseModel,
        where: {
          level: 1,
          official: true
        }
      }
    ]
  });

  const candidates: ClassModel[] = [];
  for (const klass of klasses) {
    if (klass.numberOfRegistrations >= klass.course.capacity) {
      logger.info('%s class is full, should be backfilled already');
      continue;
    }

    const days =
      dt.diff(DateTime.fromJSDate(klass.createdAt), 'days').days +
      klass.course.capacity -
      klass.numberOfRegistrations;

    const weeks = Math.ceil(days / 7);
    logger.info(
      'try to create another %s class in %d weeks',
      klass.course.name,
      weeks
    );

    candidates.push(
      createClass(
        klass.courseId,
        klass.sessions.map(ses => ({
          idx: ses.idx,
          startDate: DateTime.fromJSDate(ses.startDate).plus({ weeks }).toJSDate(),
          endDate: DateTime.fromJSDate(ses.endDate).plus({ weeks }).toJSDate()
        }))
      )
    );
  }

  return candidates;
}

export async function getPreschedules(
  dt: DateTime,
  schedules: ScheduleDefs,
  logger: Logger
) {
  if (isHoliday(dt)) {
    logger.info("It's a holiday!");
    return [];
  }

  const candidates: ClassModel[] = [];

  for (const courseId of Object.keys(schedules)) {
    const course = await catalogStore.getCourseById(courseId);

    for (const schedule of schedules[courseId]) {
      if (!isRightWeek(schedule, dt)) {
        continue;
      }

      logger.info('%s is planned at %s', courseId, dt.toFormat('ff'));

      candidates.push(
        buildClass(
          dt.set({
            hour: schedule.hour,
            minute: schedule.minute,
            second: 0,
            millisecond: 0
          }),
          course
        )
      );
    }
  }

  if (candidates.length === 0) {
    logger.info('no class planned today');
  }

  return candidates;
}

export function buildCamps(ts: DateTime, course: CourseModel) {
  const dayPatterns = campPatterns[ts.weekday % 7];

  return dayPatterns.map(pattern => {
    const sessions: Pick<SessionModel, 'startDate' | 'endDate' | 'idx'>[] = [];

    let st = ts;
    for (let idx = 0; idx < regularClassLength; idx++) {
      sessions.push({
        idx,
        startDate: st.toJSDate(),
        endDate: st.plus({ minutes: course.duration }).toJSDate()
      });

      st = st.plus({ days: pattern[idx] });
    }

    return createClass(course.id, sessions);
  });
}

export function buildClass(ts: DateTime, course: CourseModel, isCamp = false) {
  if (!course.isRegular) {
    return createClass(course.id, [
      {
        idx: 0,
        startDate: ts.toJSDate(),
        endDate: ts.plus({ minutes: course.duration }).toJSDate()
      }
    ]);
  }

  if (isCamp) {
    return buildCamps(ts, course)[0];
  }

  const sessions: Pick<SessionModel, 'startDate' | 'endDate' | 'idx'>[] = [];

  for (let idx = 0; idx < regularClassLength; idx++) {
    sessions.push({
      idx,
      startDate: ts.toJSDate(),
      endDate: ts.plus({ minutes: course.duration }).toJSDate()
    });

    ts = getNextWeek(ts);
  }

  return createClass(course.id, sessions);
}

function createClass(
  courseId: string,
  sessions: Pick<SessionModel, 'startDate' | 'endDate' | 'idx'>[] = []
) {
  return new ClassModel(
    {
      courseId,
      startDate: sessions[0].startDate,
      endDate: sessions[sessions.length - 1].endDate,
      sessions
    },
    {
      include: [SessionModel]
    }
  );
}
