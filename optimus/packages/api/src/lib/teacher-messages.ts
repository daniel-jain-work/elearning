import { ClassModel, CourseModel, StudentModel, TeacherModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { publishSMS, sendSESEmail } from './aws';
import { TeacherSupport, Treasurer } from './mailer';
import { getOpsClassUrl, getOpsTeacherUrl, getOpsUserUrl } from './url-utils';

export async function announceAssignment(
  teacher: TeacherModel,
  klass: ClassModel,
  logger: Logger
) {
  const ct = DateTime.fromJSDate(klass.startDate, {
    zone: teacher.timezone
  });

  logger.info(
    { teacherId: teacher.id, assigned: true },
    '%s is assigned to %s',
    klass.courseId,
    teacher.fullName
  );

  const course = klass.course || (await klass.getCourse());

  try {
    const sesResult = await sendSESEmail(
      {
        ToAddresses: [teacher.email]
      },
      {
        Template: {
          TemplateArn:
            'arn:aws:mobiletargeting:us-west-2:816670140901:templates/ALERT_class-assigned/EMAIL',
          TemplateData: JSON.stringify({
            teacherName: teacher.firstName,
            courseName: course.name,
            classTime: ct.toFormat('ffff')
          })
        }
      }
    );

    logger.info(
      {
        teacherId: teacher.id,
        ...sesResult.$response.data
      },
      'notified via %s',
      teacher.email
    );

    if (
      teacher.phoneNumber &&
      klass.startDate > new Date() &&
      ct.diffNow('hours').hours < 24
    ) {
      const snsResult = await publishSMS(
        teacher.phoneNumber,
        `You are assigned to teach ${course.name} starting ${ct.toFormat('fff')}`
      );

      logger.info(
        {
          teacherId: teacher.id,
          ...snsResult.$response.data
        },
        'notified via %s',
        teacher.phoneNumber
      );
    }
  } catch (err) {
    logger.error(err, 'fail to sent out announcement');
  }
}

export const announcePurchase = (
  teacher: TeacherModel,
  student: StudentModel,
  klass: ClassModel,
  course: CourseModel
) =>
  sendSESEmail(
    {
      ToAddresses: [teacher.email],
      CcAddresses: [Treasurer]
    },
    {
      Template: {
        TemplateArn:
          'arn:aws:mobiletargeting:us-west-2:816670140901:templates/CC_purchase_attribution/EMAIL',
        TemplateData: JSON.stringify({
          studentName: student.name,
          email: student.parent.email,
          courseName: course.name,
          classTime: DateTime.fromJSDate(klass.startDate, {
            zone: teacher.timezone
          }).toFormat('ffff'),
          userUrl: getOpsUserUrl(student.parent),
          classUrl: getOpsClassUrl(klass)
        })
      }
    }
  );

export const alertScheduleChanges = (teacher: TeacherModel, previous: number) =>
  sendSESEmail(
    {
      ToAddresses: [teacher.email],
      CcAddresses: [TeacherSupport]
    },
    {
      Template: {
        TemplateArn:
          'arn:aws:mobiletargeting:us-west-2:816670140901:templates/ALERT_teacher-hours-drop/EMAIL',
        TemplateData: JSON.stringify({
          teacherName: teacher.firstName,
          current: teacher.hours,
          previous
        })
      }
    }
  );

export const sendAlertToTagAttendance = (
  course: CourseModel,
  teacher: TeacherModel
) =>
  sendSESEmail(
    { ToAddresses: [teacher.email] },
    {
      Template: {
        TemplateArn:
          'arn:aws:mobiletargeting:us-west-2:816670140901:templates/ALERT_please_tag_attendance/EMAIL',
        TemplateData: JSON.stringify({
          teacherName: teacher.firstName,
          courseName: course.name
        })
      }
    }
  );

export const sendAlertToReassignTeacher = (
  klass: ClassModel,
  teacher: TeacherModel
) =>
  sendSESEmail(
    { ToAddresses: [TeacherSupport] },
    {
      Template: {
        TemplateArn:
          'arn:aws:mobiletargeting:us-west-2:816670140901:templates/ALERT_teacher-requested-reassign/EMAIL',
        TemplateData: JSON.stringify({
          classUrl: getOpsClassUrl(klass),
          courseName: klass.course.name,
          teacherName: teacher.firstName,
          teacherUrl: getOpsTeacherUrl(teacher)
        })
      }
    }
  );

export async function sendAlertToStartClass(
  startDate: Date,
  klass: ClassModel,
  logger: Logger
) {
  const classTime = DateTime.fromJSDate(startDate, {
    zone: klass.teacher.timezone
  }).toFormat('t ZZZZ');

  const sesResult = await sendSESEmail(
    {
      ToAddresses: [klass.teacher.email],
      CcAddresses: [TeacherSupport]
    },
    {
      Template: {
        TemplateArn:
          'arn:aws:mobiletargeting:us-west-2:816670140901:templates/ALERT-class-is-not-started-on-time/EMAIL',
        TemplateData: JSON.stringify({
          teacherName: klass.teacher.firstName,
          classUrl: getOpsClassUrl(klass),
          courseName: klass.course.name,
          classTime
        })
      }
    }
  );

  logger.info(
    {
      classId: klass.id,
      teacherId: klass.teacherId,
      ...sesResult.$response.data
    },
    'notified via %s',
    klass.teacher.email
  );

  if (klass.teacher.phoneNumber) {
    const publishResult = await publishSMS(
      klass.teacher.phoneNumber,
      `You have a ${klass.course.name} class starting right now at ${classTime}`
    );

    logger.info(
      {
        classId: klass.id,
        teacherId: klass.teacherId,
        ...publishResult.$response.data
      },
      'notified via %s',
      klass.teacher.phoneNumber
    );
  }
}
