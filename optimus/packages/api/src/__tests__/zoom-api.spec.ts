import { defaultTimezone, tzOpts } from 'cl-common';
import { ClassModel, SessionModel } from 'cl-models';
import { DateTime } from 'luxon';
import sequelize from '../sequelize';
import { buildMeetingDetails } from '../zoomtopia/zoom-api';
import { trialClassMock, weeklyClassMock } from './mocks';

afterAll(() => sequelize.close());

describe('build zoom meeting', () => {
  test('build a zoom meeting for trial class', async () => {
    const klass = new ClassModel(trialClassMock, { include: [SessionModel] });
    const course = await klass.getCourse();
    const meeting = buildMeetingDetails(klass, course, '');

    expect(meeting.topic).toBe(
      course.name + ' (Thursday, March 15, 2018, 6:00 PM Pacific Daylight Time)'
    );
    expect(meeting.type).toBe(2);
    expect(meeting.start_time).toBe(
      DateTime.fromISO(trialClassMock.startDate, tzOpts).toFormat(
        "yyyy-MM-dd'T'HH:mm:ss"
      )
    );
    expect(meeting.timezone).toBe(defaultTimezone);
    expect(meeting.duration).toBe(course.duration);
  });

  test('build a zoom meeting for multi-session class', async () => {
    const klass = new ClassModel(weeklyClassMock, { include: [SessionModel] });
    const course = await klass.getCourse();
    const meeting = buildMeetingDetails(klass, course, 'password');

    expect(meeting.topic).toBe(
      course.name + ' (6:00 PM Pacific Daylight Time, 10/31, 11/07, 11/14, 11/21)'
    );
    expect(meeting.type).toBe(3);
    expect(meeting.start_time).toBe(
      DateTime.fromISO(weeklyClassMock.startDate, tzOpts).toFormat(
        "yyyy-MM-dd'T'HH:mm:ss"
      )
    );
    expect(meeting.timezone).toBe(defaultTimezone);
    expect(meeting.duration).toBe(course.duration);
    expect(meeting.password).toBe('password');
  });
});
