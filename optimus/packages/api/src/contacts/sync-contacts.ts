import { Topic, UserLevel } from 'cl-common';
import { ClassModel, EnrollmentModel, StudentModel, UserModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import { catalogStore } from '../lib/dataloader';
import { Contact, upsertContacts } from '../lib/sendgrid';

export async function syncContacts(dt: DateTime, logger: Logger) {
  const lastHour = dt.minus({ hour: 1 });

  const changed = await EnrollmentModel.findAll({
    attributes: ['studentId'],
    where: {
      updatedAt: {
        [Op.between]: [
          lastHour.startOf('hour').toJSDate(),
          lastHour.endOf('hour').toJSDate()
        ]
      }
    }
  });

  if (changed.length === 0) {
    return;
  }

  const users = await UserModel.findAll({
    where: {
      level: UserLevel.REGULAR,
      teacherId: {
        [Op.is]: null
      }
    },
    include: [
      {
        model: StudentModel.unscoped(),
        as: 'children',
        required: true,
        include: [
          {
            model: EnrollmentModel,
            include: [ClassModel.unscoped()],
            where: {
              statusCode: {
                [Op.gte]: 0
              },
              studentId: {
                [Op.in]: changed.map(c => c.studentId)
              }
            }
          }
        ]
      }
    ]
  });

  const contacts = await Promise.all(users.map(user => createContact(user)));
  logger.info('%d contacts updated', contacts.length);
  await upsertContacts(contacts);
}

async function createContact(user: UserModel) {
  const contact: Contact = {
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    country: user.country,
    student_name: user.children[0].firstName,
    student_age: user.children[0].age,
    trials: 0,
    purchases: 0
  };

  const webinars = new Set<string>();

  for (const child of user.children) {
    for (const enrollment of child.enrollments) {
      const course = await catalogStore.getCourseById(enrollment.class.courseId);
      if (course.isTrial && enrollment.statusCode > 0) {
        contact.trials++;
      } else if (course.isRegular) {
        contact.purchases++;
      }

      switch (course.subjectId) {
        case Topic.SN:
        case Topic.AS:
          if (
            contact.scratch_level === undefined ||
            contact.scratch_level < course.level
          ) {
            contact.scratch_level = course.level;
          }
          break;
        case Topic.ROBO:
        case Topic.JROBO:
          if (
            contact.robots_level === undefined ||
            contact.robots_level < course.level
          ) {
            contact.robots_level = course.level;
          }
          break;
        case Topic.MC:
          if (
            contact.minecraft_level === undefined ||
            contact.minecraft_level < course.level
          ) {
            contact.minecraft_level = course.level;
          }
          break;
        case Topic.PY:
          if (
            contact.python_level === undefined ||
            contact.python_level < course.level
          ) {
            contact.python_level = course.level;
          }
          break;
        case Topic.AI:
          if (contact.ai_level === undefined || contact.ai_level < course.level) {
            contact.ai_level = course.level;
          }
          break;
        case Topic.WEBINARS:
          webinars.add(course.id);
          break;
      }
    }
  }

  if (webinars.size > 0) {
    contact.webinars = Array.from(webinars.values()).join(',');
  }

  return contact;
}
