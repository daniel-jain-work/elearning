import { defaultAvatarUrl, UnsubscribeGroups } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  SessionModel,
  StudentModel,
  TeacherModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import {
  ClassMaster,
  MrReminder,
  MsOps,
  Personalization,
  sendTemplatedEmail
} from '../../mailer';
import {
  createClassParams,
  createRecipient,
  createStudentParams
} from '../../mailer-utils';

// 1 day before the class
export async function sendLastdayReminder(now: DateTime) {
  const tomorrow = now.plus({
    day: 1
  });

  const teacherIntroRecipients: Personalization[] = [];
  const reminderRecipients: Personalization[] = [];

  const sessions = await SessionModel.findAll({
    where: {
      startDate: {
        [Op.between]: [
          tomorrow.startOf('day').toJSON(),
          tomorrow.endOf('day').toJSON()
        ]
      }
    },
    include: [
      StudentModel,
      {
        model: ClassModel,
        where: { active: true },
        required: true,
        include: [
          {
            model: CourseModel,
            required: true,
            where: {
              official: true
            }
          },
          {
            model: TeacherModel,
            required: true
          }
        ]
      }
    ]
  });

  for (const ses of sessions) {
    for (const student of ses.students) {
      if (!student.parent.classReminderNotification) {
        continue;
      }

      const classTime = DateTime.fromJSDate(ses.startDate, {
        zone: student.parent.timezone
      });

      const startDate = classTime.toFormat('cccc L/dd');
      const startTime = classTime.toFormat('t ZZZZZ');
      const to = createRecipient(student.parent);

      if (ses.class.course.isTrial && ses.class.teacher.bio) {
        teacherIntroRecipients.push({
          to,
          customArgs: {
            amp_user_id: student.parentId
          },
          dynamicTemplateData: {
            startDate,
            startTime,
            ...createStudentParams(student),
            ...createClassParams(ses.class, ses.class.course),
            teacher_name: ses.class.teacher.firstName,
            teacher_full: ses.class.teacher.fullName,
            teacher_avatar: ses.class.teacher.avatar || defaultAvatarUrl,
            teacher_bio: ses.class.teacher.bio
          }
        });
      } else if (ses.class.dialInLink) {
        reminderRecipients.push({
          to,
          customArgs: {
            amp_user_id: student.parentId
          },
          dynamicTemplateData: {
            ...createStudentParams(student),
            ...createClassParams(ses.class, ses.class.course),
            session: ses.idx + 1,
            startDate,
            startTime
          }
        });
      }
    }
  }

  if (reminderRecipients.length > 0) {
    await sendTemplatedEmail({
      templateId: 'd-a5f2ae82e5f544f79046ee8833041cfa',
      asm: { groupId: UnsubscribeGroups.Classes },
      from: MrReminder,
      replyTo: ClassMaster,
      personalizations: reminderRecipients,
      category: 'reminder'
    });
  }

  if (teacherIntroRecipients.length > 0) {
    await sendTemplatedEmail({
      templateId: 'd-3a864b9ae58842b7b0c81e5aa09ddba1',
      asm: { groupId: UnsubscribeGroups.Classes },
      from: MsOps,
      personalizations: teacherIntroRecipients,
      category: 'reminder'
    });
  }
}

export async function scheduleLastHourReminder(now: DateTime) {
  const dt = now.plus({ hours: 2 });

  const sessions = await SessionModel.findAll({
    where: {
      startDate: {
        [Op.between]: [dt.startOf('hour').toJSON(), dt.endOf('hour').toJSON()]
      }
    },
    include: [
      StudentModel,
      {
        model: ClassModel,
        where: { active: true },
        required: true,
        include: [
          {
            model: TeacherModel,
            required: true
          },
          {
            model: CourseModel,
            required: true,
            where: {
              official: true
            }
          }
        ]
      }
    ]
  });

  const recipients: Personalization[] = [];
  sessions.forEach(ses => {
    const start = DateTime.fromJSDate(ses.startDate);
    const reminderTime = Math.round(start.minus({ hour: 1 }).toSeconds());
    ses.students.forEach(student => {
      if (student.parent.classReminderNotification) {
        recipients.push({
          sendAt: reminderTime,
          to: createRecipient(student.parent),
          customArgs: {
            amp_user_id: student.parentId
          },
          dynamicTemplateData: {
            startTime: start.setZone(student.parent.timezone).toFormat('ffff'),
            ...createStudentParams(student),
            ...createClassParams(ses.class, ses.class.course)
          }
        });
      }
    });
  });

  if (recipients.length > 0) {
    await sendTemplatedEmail({
      templateId: 'd-9b42e64f929d4b68a66c42de190e51dd',
      asm: { groupId: UnsubscribeGroups.Classes },
      from: MrReminder,
      replyTo: ClassMaster,
      personalizations: recipients,
      category: 'reminder'
    });
  }
}
