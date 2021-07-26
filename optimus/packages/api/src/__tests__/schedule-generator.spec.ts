import { isEqual, uniq } from 'lodash';
import { DateTime } from 'luxon';
import {
  campWeekDays,
  holidays,
  paidSchedules,
  shiftConfig,
  trialSchedules
} from '../inventory/schedule-config';
import {
  buildCamps,
  getNextWeek,
  getPreschedules,
  isHoliday,
  startOfTime
} from '../inventory/schedule-generator';
import { catalogStore } from '../lib/dataloader';
import logger from '../lib/logger';
import sequelize from '../sequelize';

afterAll(() => sequelize.close());

describe('predefined schedules', () => {
  test.each(Object.keys(paidSchedules))('predefined %s schedules', async cid => {
    const course = await catalogStore.getCourseById(cid);
    expect(course.isRegular).toBeTruthy();
    paidSchedules[cid].forEach(option => {
      expect([1, 2, 3, 4, 5, 6, 7]).toContain(option.weekday);
      expect(option.hour).toBeGreaterThanOrEqual(shiftConfig.first[0]);
      expect(option.hour).toBeLessThanOrEqual(shiftConfig.last[0]);
    });
  });

  test.each(Object.keys(trialSchedules))('predefined %s schedules', async cid => {
    const course = await catalogStore.getCourseById(cid);
    expect(course.isTrial).toBeTruthy();
    trialSchedules[cid].forEach(option => {
      expect([1, 2, 3, 4, 5, 6, 7]).toContain(option.weekday);
      expect(option.hour).toBeGreaterThanOrEqual(shiftConfig.first[0]);
      expect(option.hour).toBeLessThanOrEqual(shiftConfig.last[0]);
      expect(option.interval).toBe(1);
    });
  });

  test.each(holidays)('no schedules at for holiday', async holiday => {
    const localtime = DateTime.fromISO(holiday);
    expect(isHoliday(localtime)).toStrictEqual(true);
    await expect(
      getPreschedules(localtime, trialSchedules, logger)
    ).resolves.toStrictEqual([]);
  });

  test('holiday schedules', () => {
    const ts = DateTime.fromObject({
      month: 12,
      day: 24,
      year: 2020
    });

    expect(isHoliday(ts.plus({ week: 1 }))).toBeTruthy();
    expect(getNextWeek(ts)).toStrictEqual(ts.plus({ weeks: 2 }));
  });
});

describe('generate schedules', () => {
  const offsetInWeeks = 3;
  const today = startOfTime.plus({ weeks: offsetInWeeks });

  const startDate = today.toJSDate();
  const weekday = today.weekday % 7;
  const hour = startDate.getHours();
  const minute = startDate.getMinutes();

  test('test trial schedules', async () => {
    const klasses = await getPreschedules(
      today,
      {
        scratch_0: [
          { weekday, hour, minute, interval: 1 },
          { weekday: weekday - 1, hour: 10, minute: 0, interval: 1 }
        ],
        'ai-explorers_0': [{ weekday, hour, minute, interval: 1 }]
      },
      logger
    );

    expect(klasses.map(k => [k.courseId, k.startDate])).toStrictEqual([
      ['scratch_0', startDate],
      ['ai-explorers_0', startDate]
    ]);
  });

  test('paid schedules', async () => {
    const klasses = await getPreschedules(
      today,
      {
        scratch_1: [
          {
            weekday,
            hour,
            minute,
            interval: 1
          }
        ],
        scratch_2: [
          {
            weekday,
            hour,
            minute,
            interval: 4,
            offset: offsetInWeeks % 4
          },
          {
            weekday,
            hour,
            minute,
            interval: 4,
            offset: (offsetInWeeks + 1) % 4
          }
        ],
        scratch_3: [
          {
            weekday: weekday - 1,
            hour,
            minute,
            interval: 4,
            offset: offsetInWeeks % 4
          }
        ],
        scratch_4: [
          {
            weekday,
            hour,
            minute,
            interval: 4,
            offset: (offsetInWeeks + 1) % 4
          }
        ]
      },
      logger
    );

    expect(klasses.map(k => [k.courseId, k.startDate])).toStrictEqual([
      ['scratch_1', startDate],
      ['scratch_2', startDate]
    ]);
  });
});

test('build camp class', async () => {
  const course = await catalogStore.getCourseById('scratch_1');

  for (let i = 0; i < 7; i++) {
    const ts = DateTime.local().startOf('week').plus({ day: i });

    const camps = buildCamps(ts, course);
    for (const camp of camps) {
      expect(camp.startDate.getDate()).toBe(ts.day);
      expect(camp.sessions.length).toBe(4);
      const weekdays = uniq(
        camp.sessions.map(ses => DateTime.fromJSDate(ses.startDate).weekday)
      ).sort();

      expect(campWeekDays.find(pattern => isEqual(pattern, weekdays))).toBeTruthy();
    }
  }
});
