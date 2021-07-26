import { Availability } from '@cl/types';
import { coolDownInterval, defaultTimezone, tzOpts } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  SessionModel,
  TeacherCourseModel,
  TeacherModel,
  TimeoffModel
} from 'cl-models';
import { sample } from 'lodash';
import { DateTime, Interval } from 'luxon';
import { Logger } from 'pino';
import { Op, Transaction } from 'sequelize';

export class Occupancy {
  public readonly teacher: TeacherModel;
  private tasks: Set<string>;
  private blocks: [Interval, string][];
  private courseIds: string[];

  constructor(teacher: TeacherModel, assignments: SessionModel[]) {
    this.teacher = teacher;
    this.tasks = new Set();
    this.blocks = [];

    for (const session of assignments) {
      this.process(session);
    }

    if (teacher.courses) {
      this.courseIds = teacher.courses.map(c => c.id);
    } else if (teacher.teacherCourses) {
      this.courseIds = teacher.teacherCourses.map(tc => tc.courseId);
    }
  }

  private process(session: SessionModel) {
    this.tasks.add(session.classId);
    this.blocks.push([
      Interval.fromDateTimes(
        DateTime.fromJSDate(session.startDate),
        DateTime.fromJSDate(session.endDate).plus({
          minutes: coolDownInterval
        })
      ),
      session.classId
    ]);
  }

  getConflict(klass: ClassModel) {
    for (const ses of klass.sessions) {
      const session = Interval.fromDateTimes(
        ses.startDate,
        DateTime.fromJSDate(ses.endDate).plus({ minutes: coolDownInterval })
      );
      const block = this.blocks.find(
        block => block[1] !== klass.id && block[0].overlaps(session)
      );

      if (block) {
        return block[1];
      }
    }
  }

  available(klass: ClassModel) {
    if (!hasTimeForClass(this.teacher, klass)) {
      return false;
    }

    if (this.courseIds && this.courseIds.indexOf(klass.courseId) < 0) {
      return false;
    }

    return !this.getConflict(klass);
  }

  assignClass(klass: ClassModel) {
    if (!this.tasks.has(klass.id)) {
      klass.sessions.forEach(session => this.process(session));
    }
  }
}

export const findConflictingAssignments = (t: TeacherModel, klass: ClassModel) =>
  t.getAssignments({
    where: {
      classId: {
        [Op.not]: klass.id
      },
      [Op.or]: klass.sessions.map(ses => ({
        startDate: {
          [Op.lt]: DateTime.fromJSDate(ses.endDate)
            .plus({ minutes: coolDownInterval })
            .toJSDate()
        },
        endDate: {
          [Op.gt]: DateTime.fromJSDate(ses.startDate)
            .minus({ minutes: coolDownInterval })
            .toJSDate()
        }
      }))
    },
    include: [
      {
        model: ClassModel.unscoped(),
        include: [CourseModel]
      }
    ]
  });

export function hasTimeForClass(teacher: TeacherModel, klass: ClassModel) {
  const timeoffs = teacher.timeoffs
    ? Interval.merge(
        teacher.timeoffs.map(timeoff =>
          Interval.fromDateTimes(timeoff.start, timeoff.end)
        )
      )
    : [];

  return klass.sessions.every(ses => {
    const start = DateTime.fromJSDate(ses.startDate, { zone: teacher.timezone });
    const end = DateTime.fromJSDate(ses.endDate, { zone: teacher.timezone });

    for (const timeoff of timeoffs) {
      if (timeoff.contains(start) || timeoff.contains(end)) {
        return false;
      }
    }

    const startDay = start.weekday % 7; // Sunday is 7 in luxon but 0 in js date
    const slot = teacher.availableTime.find(slot => slot.day === startDay);
    if (!slot) {
      return false;
    }

    const startMinuteOfTheDay = start.hour * 60 + start.minute;
    const endMinuteOfTheDay = end.hour * 60 + end.minute;
    return slot.times.some(
      times => startMinuteOfTheDay >= times[0] && endMinuteOfTheDay <= times[1]
    );
  });
}

export async function findAndVerifyTeacher(
  teacherId: string,
  klass: ClassModel
): Promise<{ teacher: TeacherModel; error: false | string }> {
  const teacher = await TeacherModel.findByPk(teacherId, {
    rejectOnEmpty: true,
    include: [
      TimeoffModel,
      {
        model: CourseModel,
        where: { id: klass.courseId },
        required: false
      }
    ]
  });

  if (teacher.courses.length === 0) {
    return {
      teacher,
      error: `${teacher.fullName} has not been approved to teach ${klass.courseId}`
    };
  }

  if (!hasTimeForClass(teacher, klass)) {
    return {
      teacher,
      error: `The schedule is out of ${teacher.firstName}'s working hours`
    };
  }

  const conflicts = await findConflictingAssignments(teacher, klass);
  if (conflicts.length > 0) {
    const sessionTime = DateTime.fromJSDate(conflicts[0].startDate, tzOpts).toFormat(
      'fff'
    );

    return {
      teacher,
      error: `Conflict with ${conflicts[0].class.course.name} (session ${
        conflicts[0].idx + 1
      }) at ${sessionTime}`
    };
  }

  return { teacher, error: false };
}

export async function getTeacherOccupancies(
  startDate: Date,
  endDate: Date,
  courseId?: string
) {
  const teachers = await TeacherModel.findAll({
    include: [
      TimeoffModel,
      {
        model: SessionModel,
        as: 'assignments',
        required: false,
        where: {
          endDate: { [Op.gte]: startDate },
          startDate: { [Op.lte]: endDate }
        }
      },
      courseId
        ? {
            model: CourseModel,
            required: true,
            where: {
              id: courseId
            }
          }
        : CourseModel
    ]
  });

  return teachers.map(t => new Occupancy(t, t.assignments));
}

export async function suggestBestFit(
  klass: ClassModel,
  course: CourseModel,
  logger: Logger
) {
  const teachers = await TeacherModel.findAll({
    order: [[TeacherCourseModel, 'priority', 'DESC']],
    include: [
      TimeoffModel,
      {
        model: SessionModel,
        as: 'assignments',
        required: false,
        where: {
          endDate: { [Op.gte]: klass.startDate },
          startDate: { [Op.lte]: klass.endDate }
        }
      },
      {
        model: TeacherCourseModel,
        required: true,
        where: {
          courseId: klass.courseId
        }
      }
    ]
  });

  const qualified = teachers.filter(t => {
    if (klass.teacherId === t.id) {
      return false;
    }

    const oc = new Occupancy(t, t.assignments);
    return oc.available(klass);
  });

  if (qualified.length === 0) {
    logger.info('no teacher available');
    return null;
  }

  logger.info(
    {
      candidates: qualified.map(t => [t.fullName, t.teacherCourses[0].priority])
    },
    '%d candidates found for class %s',
    qualified.length,
    course.name
  );

  if (qualified.length === 1) {
    return qualified[0];
  }

  if (course.isTrial) {
    const pool: TeacherModel[] = [];

    for (const t of qualified) {
      let tokens = t.teacherCourses[0].priority;

      if (tokens > 0) {
        const lifeSpan = Math.abs(
          DateTime.fromJSDate(t.createdAt).diffNow('weeks').weeks
        );

        // give new teacher a boost
        if (lifeSpan <= 1) {
          tokens += 9;
        } else if (lifeSpan <= 2) {
          tokens += 6;
        } else if (lifeSpan <= 4) {
          tokens += 3;
        }

        for (let i = 0; i < tokens; i++) {
          pool.push(t);
        }
      }
    }

    if (pool.length > 0) {
      return sample(pool);
    }
  }

  return sample(qualified);
}

export function calculateWorkingHours(
  availabilities: Availability[],
  timezone: string
) {
  // 7:30 in Pacific time
  const min =
    DateTime.fromObject({
      zone: defaultTimezone,
      hour: 7
    }).setZone(timezone).hour *
      60 +
    30;

  // 20:00 in Pacific time
  const max =
    DateTime.fromObject({
      zone: defaultTimezone,
      hour: 20
    }).setZone(timezone).hour * 60;

  const totalMinutes = availabilities.reduce((total, availability) => {
    for (const time of availability.times) {
      const start = Math.max(time[0], min);
      const end = Math.min(time[1], max);
      if (end > start) {
        total += end - start;
      }
    }
    return total;
  }, 0);

  return Math.round(totalMinutes / 60);
}

const MaxTokenCap = 10;

export async function rewardTeacherToken(
  klass: ClassModel,
  transaction: Transaction,
  logger: Logger
) {
  if (!klass.teacher) {
    return;
  }

  await TeacherCourseModel.increment('priority', {
    transaction,
    where: {
      teacherId: klass.teacherId,
      courseId: klass.courseId,
      priority: {
        [Op.lt]: MaxTokenCap
      }
    }
  });

  logger.info(
    { teacherId: klass.teacherId, courseId: klass.courseId },
    'reward %s 1 token',
    klass.teacher.fullName
  );
}

export async function useTrialToken(
  teacher: TeacherModel,
  course: CourseModel,
  transaction: Transaction,
  fLogger: Logger
) {
  if (!course.isTrial) {
    return;
  }

  const teacherCourses =
    teacher.teacherCourses ||
    (await TeacherCourseModel.findAll({
      where: {
        teacherId: teacher.id
      }
    }));

  const tc = teacherCourses.find(tc => tc.courseId === course.id);
  if (!tc) {
    return;
  }

  if (tc.priority > 0) {
    fLogger.info({ teacherId: teacher.id }, 'use 1 token out of %d', tc.priority);
    await tc.decrement('priority', { transaction });
  } else {
    fLogger.info('rebalance everyone else who can teach %s', course.name);
    await TeacherCourseModel.increment('priority', {
      transaction,
      where: {
        courseId: course.id,
        teacherId: {
          [Op.not]: teacher.id
        },
        priority: {
          [Op.lt]: MaxTokenCap
        }
      }
    });
  }
}
