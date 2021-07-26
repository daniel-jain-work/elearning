import { UnsubscribeGroups } from 'cl-common';
import {
  ClassModel,
  CommentModel,
  CourseModel,
  StudentModel,
  TeacherModel,
  ThreadModel
} from 'cl-models';
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

// runs hourly
export async function notifyClassroomActivities(now: DateTime, logger: Logger) {
  const lastHour = now.minus({ hour: 1 });

  const threads = await ThreadModel.findAll({
    where: {
      createdAt: {
        createdAt: {
          [Op.gte]: lastHour.startOf('hour').toJSDate(),
          [Op.lte]: lastHour.endOf('hour').toJSDate()
        }
      }
    },
    include: [
      StudentModel,
      {
        model: ClassModel,
        required: true,
        where: {
          endDate: {
            [Op.gte]: now.minus({ days: 5 }).toJSDate()
          }
        },
        include: [
          CourseModel,
          { model: TeacherModel, required: true },
          { model: StudentModel, required: true }
        ]
      }
    ]
  });

  const comments = await CommentModel.findAll({
    where: {
      createdAt: {
        [Op.gte]: lastHour.startOf('hour').toJSDate(),
        [Op.lte]: lastHour.endOf('hour').toJSDate()
      }
    },
    include: [
      { model: StudentModel, required: true },
      {
        model: ThreadModel,
        required: true,
        include: [
          {
            model: ClassModel,
            where: {
              endDate: {
                [Op.gte]: now.minus({ days: 5 }).toJSDate()
              }
            },
            include: [CourseModel, TeacherModel]
          }
        ]
      }
    ]
  });

  if (threads.length === 0 && comments.length === 0) {
    return;
  }

  const teacherRecipients: Personalization[] = [];
  const studentRecipients: Personalization[] = [];

  threads.forEach(thread => {
    const klass = thread.class;

    // student comment, notify class teacher
    if (thread.student) {
      logger.info(
        { classId: thread.classId, userId: thread.student.parentId },
        'a new thread started by student in the past hour'
      );

      teacherRecipients.push({
        to: createRecipient(klass.teacher),
        customArgs: {
          amp_user_id: klass.teacher.id
        },
        dynamicTemplateData: {
          ...createClassParams(klass, klass.course),
          ...createStudentParams(thread.student),
          teacher_name: klass.teacher.firstName,
          quote: thread.content,
          classroomUrl: format({
            host: siteUrl.teaching,
            pathname: '/classroom/' + thread.classId
          })
        }
      });

      return;
    }

    // teacher comment, notify all students
    if (thread.teacherId) {
      logger.info(
        { classId: thread.classId, teacherId: thread.teacherId },
        'a new thread started by teacher in the past hour'
      );

      klass.students.forEach(student => {
        if (!student.parent.classroomActivityNotification) {
          return;
        }

        studentRecipients.push({
          to: createRecipient(student.parent),
          customArgs: {
            amp_user_id: student.parentId
          },
          dynamicTemplateData: {
            ...createClassParams(klass, klass.course),
            ...createStudentParams(student),
            teacher_name: klass.teacher.firstName,
            quote: thread.content,
            classroomUrl: format({
              host: siteUrl.main,
              pathname: '/classroom/' + klass.id + '/' + student.id
            })
          }
        });
      });
    }
  });

  comments.forEach(comment => {
    const klass = comment.thread.class;

    // student comment, notify class teacher
    teacherRecipients.push({
      to: createRecipient(klass.teacher),
      customArgs: {
        amp_user_id: klass.teacher.id
      },
      dynamicTemplateData: {
        ...createClassParams(klass, klass.course),
        ...createStudentParams(comment.student),
        teacher_name: klass.teacher.firstName,
        quote: comment.content,
        classroomUrl: format({
          host: siteUrl.teaching,
          pathname: '/classroom/' + klass.id
        })
      }
    });
  });

  if (teacherRecipients.length > 0) {
    await sendTemplatedEmail({
      templateId: 'd-4007da12c1014ddea565aaa5f826c9e1',
      personalizations: teacherRecipients,
      from: ClassMaster,
      asm: {
        groupId: UnsubscribeGroups.Classes
      }
    });
  }

  if (studentRecipients.length > 0) {
    await sendTemplatedEmail({
      templateId: 'd-2c5f9eecf38f482ea03872d53240c847',
      personalizations: studentRecipients,
      from: ClassMaster,
      asm: {
        groupId: UnsubscribeGroups.Classes
      }
    });
  }
}
