import { ClassActivityType } from 'cl-common';
import {
  AttendanceModel,
  ClassActivityLogModel,
  ClassModel,
  CourseModel,
  SessionModel,
  StudentModel,
  TeacherModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import {
  sendAlertToStartClass,
  sendAlertToTagAttendance
} from '../lib/teacher-messages';
import { getMeeting } from '../zoomtopia/zoom-api';

export async function sendMeetingNotStartedAlerts(dt: DateTime, logger: Logger) {
  const sessions = await SessionModel.findAll({
    where: {
      startDate: {
        [Op.gte]: dt.minus({ minutes: 5 }).startOf('minute').toJSDate(),
        [Op.lte]: dt.toJSDate()
      }
    },
    include: [
      {
        model: ClassActivityLogModel,
        required: false,
        where: {
          type: ClassActivityType.MeetingStarted
        }
      },
      {
        model: StudentModel.unscoped(),
        attributes: ['id'],
        required: true
      },
      {
        model: ClassModel,
        required: true,
        where: {
          active: true
        },
        include: [
          CourseModel,
          {
            model: TeacherModel,
            required: true
          }
        ]
      }
    ]
  });

  for (const ses of sessions) {
    if (!ses.class.zoomId || ses.classActivityLogs.length > 0) {
      continue;
    }

    const meeting = await getMeeting(ses.class.zoomId, logger);
    if (!meeting || meeting.status === 'started') {
      logger.warn(
        { classId: ses.classId },
        'class already started, but meeting started webhook is delayed'
      );
      continue;
    }

    await sendAlertToStartClass(ses.startDate, ses.class, logger);
  }
}

export async function sendTagAttendanceAlerts(now: DateTime, logger: Logger) {
  const dt = now.minus({ hours: 3 });

  const sessions = await SessionModel.findAll({
    where: {
      endDate: {
        [Op.between]: [dt.startOf('hour').toJSDate(), dt.endOf('hour').toJSDate()]
      }
    },
    include: [
      AttendanceModel,
      {
        model: StudentModel,
        required: true
      },
      {
        model: ClassModel.unscoped(),
        required: true,
        include: [
          CourseModel,
          {
            model: TeacherModel,
            required: true
          }
        ]
      }
    ]
  });

  for (const ses of sessions) {
    if (ses.attendances.length > 0 || !ses.class.course.official) {
      continue;
    }

    logger.info(
      { classId: ses.classId, email: ses.class.teacher.email },
      'send %s reminder to tag student attendance',
      ses.class.teacher.firstName
    );

    await sendAlertToTagAttendance(ses.class.course, ses.class.teacher);
  }
}
