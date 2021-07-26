import { UnsubscribeGroups } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  EnrollmentModel,
  SessionModel,
  TeacherModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Op, QueryTypes } from 'sequelize';
import logger from '../../logger';
import { ClassMaster, Personalization, sendTemplatedEmail } from '../../mailer';
import { createRecipient } from '../../mailer-utils';
import sequelize from '../sequelize';

// runs daily late in the afternoon
export async function sendTeacherSchedules(now: DateTime) {
  const tomorrow = now.plus({ day: 1 });

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
      {
        model: ClassModel,
        required: true,
        include: [
          CourseModel,
          {
            model: TeacherModel,
            required: true
          },
          {
            model: TeacherModel,
            as: 'observers'
          }
        ]
      }
    ]
  });

  const assignments = new Map<string, [TeacherModel, SessionModel[]]>();

  function addAssignment(teacher: TeacherModel, ses: SessionModel) {
    const result = assignments.get(teacher.id) || [teacher, []];
    result[1].push(ses);
    assignments.set(teacher.id, result);
  }

  for (const ses of sessions) {
    addAssignment(ses.class.teacher, ses);
    for (const observer of ses.class.observers) {
      addAssignment(observer, ses);
    }
  }

  if (assignments.size > 0) {
    const personalizations: Personalization[] = [];

    for (const result of assignments.values()) {
      const teacher = result[0];
      personalizations.push({
        to: createRecipient(teacher),
        dynamicTemplateData: {
          teacher_name: teacher.firstName,
          tasks: result[1].map(ses => ({
            courseName: ses.class.course.name,
            observer: ses.class.teacherId !== teacher.id,
            classTime: DateTime.fromJSDate(ses.startDate, {
              zone: teacher.timezone
            }).toFormat('tttt')
          }))
        }
      });
    }

    logger.info('send teacher schedules to %o', personalizations);

    await sendTemplatedEmail({
      templateId: 'd-d6241ed546d1401889b693b593545d64',
      asm: { groupId: UnsubscribeGroups.Classes },
      from: ClassMaster,
      personalizations,
      dynamicTemplateData: {
        classDate: tomorrow.toFormat('cccc, LLL d')
      }
    });
  }
}

const SelfEvaluateCriterionQuery = `
SELECT
  t.*,
  COUNT(c.id) numberOfTrials
FROM
  ${TeacherModel.tableName} t
  INNER JOIN ${ClassModel.tableName} c ON t.id = c.teacherId
  INNER JOIN ${EnrollmentModel.tableName} e ON c.id = e.classId
  INNER JOIN ${CourseModel.tableName} co ON c.courseId = co.id
WHERE
  c.startDate < NOW()
  AND t.deletedAt IS NULL
  AND e.statusCode > 0
  AND co.official AND co.level = 0
  AND t.id IN (:tids)
GROUP BY
  t.id
HAVING numberOfTrials = 3
`;

export async function sendReflectionReminder(now: DateTime) {
  // find all the teachers with trial classes today
  const trials = await ClassModel.findAll({
    where: {
      startDate: {
        [Op.between]: [now.minus({ day: 1 }).toJSON(), now.toJSON()]
      },
      teacherId: {
        [Op.not]: null
      }
    },
    include: [
      {
        model: CourseModel,
        where: {
          official: true,
          level: 0
        }
      }
    ]
  });

  if (trials.length === 0) {
    return;
  }

  const teachers = await sequelize.query<TeacherModel>(SelfEvaluateCriterionQuery, {
    type: QueryTypes.SELECT,
    mapToModel: true,
    model: TeacherModel,
    replacements: {
      tids: trials.map(t => t.teacherId)
    }
  });

  if (teachers.length > 0) {
    await sendTemplatedEmail({
      templateId: 'd-0a76e5ee025a4c1199868ebf16f75502',
      from: ClassMaster,
      personalizations: teachers.map(t => ({
        to: createRecipient(t),
        customArgs: {
          amp_user_id: t.id
        },
        dynamicTemplateData: {
          teacher_name: t.firstName
        }
      }))
    });
  }
}
