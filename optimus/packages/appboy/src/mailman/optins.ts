import { UnsubscribeGroups } from 'cl-common';
import { ClassModel, CourseModel, EnrollmentModel, StudentModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import { format } from 'url';
import { ClassMaster, Personalization, sendTemplatedEmail } from '../mailer';
import {
  createClassParams,
  createRecipient,
  createStudentParams,
  siteUrl
} from '../mailer-utils';

export async function autoEnroll(classId: string, logger: Logger) {
  const klass = await ClassModel.findByPk(classId, {
    rejectOnEmpty: true,
    include: [
      CourseModel,
      {
        model: EnrollmentModel,
        attributes: ['studentId']
      }
    ]
  });

  logger.info(
    '%d students already registered for %s',
    klass.enrollments.length,
    klass.course.name
  );

  if (klass.startDate < new Date() || klass.course.official) {
    return;
  }

  const students = await StudentModel.findAll({
    where: {
      id: {
        [Op.notIn]: klass.enrollments.map(e => e.studentId)
      },
      ['details.optIns.' + klass.course.subjectId]: true
    }
  });

  logger.info('%d students will be auto enrolled', students.length);
  if (students.length === 0) {
    return;
  }

  await EnrollmentModel.bulkCreate(
    students.map(s => ({
      classId: klass.id,
      studentId: s.id,
      source: 'auto-enroll'
    }))
  );

  const classTime = DateTime.fromJSDate(klass.startDate);
  const recipients: Personalization[] = students.map(s => ({
    to: createRecipient(s.parent),
    customArgs: {
      amp_user_id: s.parentId
    },
    dynamicTemplateData: {
      ...createStudentParams(s),
      ...createClassParams(klass, klass.course),
      classTime: classTime.setZone(s.parent.timezone).toFormat('ffff'),
      optout: format({
        host: siteUrl.main,
        pathname: '/optout/' + klass.course.subjectId,
        query: {
          uid: s.parentId
        }
      })
    }
  }));

  await sendTemplatedEmail({
    templateId: 'd-edcffbc8b85843149126d0b6264a5ae4',
    from: ClassMaster,
    asm: { groupId: UnsubscribeGroups.Announcements },
    personalizations: recipients
  });
}
