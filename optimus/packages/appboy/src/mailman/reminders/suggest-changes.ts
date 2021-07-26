import { UnsubscribeGroups } from 'cl-common';
import { ClassModel, CourseModel, EnrollmentModel, StudentModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import {
  ClassMaster,
  MsOps,
  Personalization,
  sendTemplatedEmail
} from '../../mailer';
import { createRecipient, createStudentParams } from '../../mailer-utils';

const LOOK_AHEAD_DAYS = 15;

export async function sendScheduleSuggestions(now: DateTime) {
  const classTime = now.plus({ days: 4 });

  // look Y days ahead (after the planned starting time) to find the same classes
  const latestClassDate = classTime
    .plus({ days: LOOK_AHEAD_DAYS })
    .endOf('day')
    .toJSDate();

  const allClasses = await ClassModel.findAll({
    include: [
      CourseModel,
      {
        model: StudentModel,
        required: true
      }
    ],
    where: {
      active: true,
      startDate: {
        [Op.between]: [
          classTime.startOf('day').toJSON(),
          classTime.endOf('day').toJSON()
        ]
      }
    }
  });

  if (allClasses.length === 0) {
    return;
  }

  const recipients: Personalization[] = [];
  for (const klass of allClasses) {
    if (klass.students.length !== 1 || !klass.course.isRegular) {
      continue;
    }

    // find classes with students happening within 7 dats after this class
    // the goal is really to try merge single student classes to be more efficient
    const candidates = await ClassModel.findAll({
      order: [['startDate', 'ASC']],
      where: {
        courseId: klass.courseId,
        id: {
          [Op.not]: klass.id
        },
        startDate: {
          [Op.gt]: klass.startDate,
          [Op.lte]: latestClassDate
        }
      },
      include: [
        {
          model: EnrollmentModel,
          attributes: ['id'],
          required: true
        }
      ]
    });

    const nextClasses = candidates.filter(
      k => k.enrollments.length < klass.course.capacity
    );

    if (nextClasses.length == 0) {
      continue;
    }

    const student = klass.students[0];
    const dtOpts = { zone: student.parent.timezone };
    const suggestedClasses = nextClasses.map(k => ({
      classTime: DateTime.fromJSDate(k.startDate, dtOpts).toFormat('cccc t'),
      classDates: k.schedules
        .map(schedule => DateTime.fromJSDate(schedule[0], dtOpts).toFormat('D'))
        .join(', ')
    }));

    recipients.push({
      to: createRecipient(student.parent),
      cc: ClassMaster,
      customArgs: {
        amp_user_id: student.parentId
      },
      dynamicTemplateData: {
        ...createStudentParams(student),
        suggestedClasses,
        current: {
          courseName: klass.course.name,
          classTime: DateTime.fromJSDate(klass.startDate, dtOpts).toFormat('cccc t'),
          classDates: klass.schedules
            .map(schedule => DateTime.fromJSDate(schedule[0], dtOpts).toFormat('D'))
            .join(', ')
        }
      }
    });
  }

  if (recipients.length > 0) {
    await sendTemplatedEmail({
      from: MsOps,
      templateId: 'd-87bd7fb2d35d4597ab73cb2094f87e31',
      asm: { groupId: UnsubscribeGroups.Classes },
      personalizations: recipients
    });
  }
}
