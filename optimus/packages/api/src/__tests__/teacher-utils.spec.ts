import { Availability } from '@cl/types';
import { defaultTimezone, tzOpts } from 'cl-common';
import { ClassModel, SessionModel, TeacherModel, TimeoffModel } from 'cl-models';
import { DateTime } from 'luxon';
import { nanoid } from 'nanoid';
import {
  calculateWorkingHours,
  findAndVerifyTeacher,
  findConflictingAssignments,
  hasTimeForClass,
  Occupancy
} from '../lib/teacher-utils';
import sequelize from '../sequelize';
import { trialClassMock, weeklyClassMock } from './mocks';

const teacher = new TeacherModel({
  email: nanoid() + '@cl.cc',
  firstName: 'Jane',
  lastName: 'Doe',
  details: {
    timezone: defaultTimezone
  }
});

beforeAll(async () => {
  await teacher.save();
});

afterAll(async () => {
  await teacher.destroy();
  await sequelize.close();
});

test('teacher time', async () => {
  const now = DateTime.local().setZone(defaultTimezone);
  const startDate = now.toJSDate();
  const endDate = now.plus({ minutes: 55 }).toJSDate();

  const klass = await ClassModel.create(
    {
      courseId: 'scratch_0',
      startDate,
      endDate,
      sessions: [
        {
          idx: 0,
          startDate,
          endDate
        }
      ]
    },
    { include: [SessionModel] }
  );

  expect(hasTimeForClass(teacher, klass)).toBeFalsy();

  const startMinute = now.hour * 60 + now.minute;
  const endMinute = startMinute + 60;

  await teacher.update({
    'details.availableTime': [
      {
        day: now.weekday % 7,
        times: [[startMinute, endMinute]]
      }
    ]
  });
  expect(hasTimeForClass(teacher, klass)).toBeTruthy();

  // timeoffs
  await expect(teacher.getTimeoffs()).resolves.toStrictEqual([]);
  const timeoffs = await TimeoffModel.bulkCreate([
    {
      teacherId: teacher.id,
      start: now.minus({ day: 2 }).toJSDate(),
      end: now.minus({ day: 1 }).toJSDate()
    },
    {
      teacherId: teacher.id,
      start: now.minus({ hour: 1 }).toJSDate(),
      end: now.plus({ hour: 1 }).toJSDate()
    },
    {
      teacherId: teacher.id,
      start: now.plus({ day: 1 }).toJSDate(),
      end: now.plus({ day: 2 }).toJSDate()
    }
  ]);

  expect(timeoffs).toHaveLength(3);
  await teacher.reload({ include: [TimeoffModel] });
  expect(teacher.timeoffs).toHaveLength(2);
  expect(hasTimeForClass(teacher, klass)).toBeFalsy();

  await timeoffs[1].destroy();
  await teacher.reload({ include: [TimeoffModel] });
  expect(teacher.timeoffs).toHaveLength(1);
  expect(hasTimeForClass(teacher, klass)).toBeTruthy();
});

test('teacher occupancies', async () => {
  const trialClass = await ClassModel.create(trialClassMock, {
    include: [SessionModel]
  });
  const weeklyClass = await ClassModel.create(weeklyClassMock, {
    include: [SessionModel]
  });

  teacher.classes = [trialClass, weeklyClass];
  const oc = new Occupancy(teacher, [
    ...trialClass.sessions,
    ...weeklyClass.sessions
  ]);

  expect(oc.getConflict(trialClass)).toBeFalsy();
  expect(oc.getConflict(weeklyClass)).toBeFalsy();

  const klass = new ClassModel(
    {
      courseId: trialClassMock.courseId,
      startDate: trialClassMock.startDate,
      endDate: trialClassMock.endDate,
      sessions: trialClassMock.sessions
    },
    { include: [SessionModel] }
  );

  expect(oc.getConflict(klass)).toBe(trialClass.id);

  klass.sessions = SessionModel.bulkBuild([
    {
      startDate: DateTime.fromJSDate(klass.startDate)
        .plus({ minutes: 40 })
        .toJSDate(),
      endDate: DateTime.fromJSDate(klass.endDate).plus({ minutes: 40 }).toJSDate(),
      idx: 0
    }
  ]);

  expect(oc.getConflict(klass)).toBe(trialClass.id);

  klass.sessions = SessionModel.bulkBuild([
    {
      ...weeklyClassMock.sessions[3]
    },
    {
      startDate: DateTime.fromJSDate(weeklyClass.sessions[3].startDate)
        .plus({ week: 1 })
        .toJSDate(),
      endDate: DateTime.fromJSDate(weeklyClass.sessions[3].endDate)
        .plus({ week: 1 })
        .toJSDate(),
      idx: 1
    }
  ]);

  expect(oc.getConflict(klass)).toBe(weeklyClass.id);

  klass.sessions = SessionModel.bulkBuild([
    {
      idx: 0,
      startDate: DateTime.fromJSDate(klass.startDate).plus({ year: 1 }).toJSDate(),
      endDate: DateTime.fromJSDate(klass.endDate).plus({ year: 1 }).toJSDate()
    }
  ]);

  expect(oc.getConflict(klass)).toBeFalsy();
});

test('teacher hours', () => {
  expect(calculateWorkingHours([], defaultTimezone)).toBe(0);

  // Mon 9:00 AM – 1:00 PM
  // Wed 9:00 AM – 1:00 PM
  // Thu 9:00 AM – 1:00 PM
  // Fri 9:00 AM – 5:00 PM
  // Sat 9:00 AM – 2:00 PM
  const availablilities: Availability[] = [
    {
      times: [[540, 780]],
      day: 1
    },
    {
      times: [[540, 780]],
      day: 3
    },
    {
      times: [[540, 780]],
      day: 4
    },
    {
      times: [[540, 1020]],
      day: 5
    },
    {
      times: [[540, 840]],
      day: 6
    }
  ];

  expect(calculateWorkingHours(availablilities, defaultTimezone)).toBe(25);
  expect(calculateWorkingHours(availablilities, 'America/New_York')).toBe(18);
});

test('teacher availability', async () => {
  const k1 = await ClassModel.create(weeklyClassMock, {
    include: [SessionModel]
  });
  const k2 = await ClassModel.create(
    { ...trialClassMock, teacherId: teacher.id },
    {
      include: [SessionModel]
    }
  );

  let result = await findAndVerifyTeacher(teacher.id, k1);
  expect(result.error).toContain(k1.courseId);

  await teacher.setCourses([k1.courseId, k2.courseId]);
  result = await findAndVerifyTeacher(teacher.id, k1);
  expect(result.error).toContain('working hours');

  await teacher.update({
    'details.availableTime': k1.sessions.map(ses => {
      const dt = DateTime.fromJSDate(ses.startDate, tzOpts);
      const startMinute = dt.hour * 60 + dt.minute;
      return {
        day: dt.get('weekday') % 7,
        times: [[startMinute, startMinute + 100]]
      };
    })
  });

  result = await findAndVerifyTeacher(teacher.id, k1);
  expect(result.teacher.id).toBe(teacher.id);

  await k1.setObservers([teacher]);

  let assignments = await findConflictingAssignments(
    teacher,
    new ClassModel(weeklyClassMock, { include: [SessionModel] })
  );
  expect(assignments).toHaveLength(4);

  assignments = await findConflictingAssignments(
    teacher,
    new ClassModel(trialClassMock, { include: [SessionModel] })
  );
  expect(assignments[0].classId).toBe(k2.id);
});
