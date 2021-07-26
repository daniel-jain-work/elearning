/**
 * state chart: https://www.lucidchart.com/documents/edit/29c1a741-0446-4bb3-9bd9-e277c13255ab/aAAoHW~cLPXC
 */

import { UserLevel } from 'cl-common';
import {
  ClassModel,
  EmailCampaignModel,
  EnrollmentModel,
  StudentModel,
  UserModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';

export const campaignName = 'New User Nurturing';
export const totalStages = 2;

// users created in the past 2 days without registering classes
export async function addInactiveUsers(
  now: DateTime,
  candidates: Set<string>,
  fLogger: Logger
) {
  const dt = now.minus({ days: 2 });
  const users = await UserModel.findAll({
    attributes: ['id'],
    where: {
      paid: false,
      level: 0,
      teacherId: null,
      createdAt: {
        [Op.between]: [dt.startOf('day').toJSON(), dt.endOf('day').toJSON()]
      }
    },
    include: [
      {
        model: StudentModel.unscoped(),
        as: 'children',
        attributes: ['id'],
        include: [
          {
            model: EnrollmentModel,
            attributes: ['id']
          }
        ]
      }
    ]
  });

  users.forEach(user => {
    for (const child of user.children) {
      if (child.enrollments.length > 0) {
        return;
      }
    }

    candidates.add(user.id);
    fLogger.info({ userId: user.id }, 'add user to campain %s', campaignName);
  });
}

// students who have never paid and not scheduling any new clasees after 3 days
export async function addInactiveStudents(
  now: DateTime,
  candidates: Set<string>,
  fLogger: Logger
) {
  const dt = now.minus({ days: 3 });

  const enrollments = await EnrollmentModel.findAll({
    attributes: ['id'],
    where: {
      updatedAt: {
        [Op.between]: [dt.startOf('day').toJSON(), dt.endOf('day').toJSON()]
      }
    },
    include: [
      {
        model: StudentModel,
        required: true,
        include: [
          {
            model: ClassModel.unscoped(),
            attributes: ['id'],
            required: false,
            where: {
              endDate: {
                [Op.gt]: now.toJSDate()
              }
            }
          }
        ]
      }
    ]
  });

  enrollments.forEach(er => {
    if (
      er.student.parent.paid ||
      er.student.parent.teacherId ||
      er.student.parent.level > UserLevel.REGULAR ||
      er.student.classes.length > 0
    ) {
      return;
    }

    fLogger.info(
      { userId: er.student.parentId },
      'add user to campain %s',
      campaignName
    );

    candidates.add(er.student.parentId);
  });
}

export async function getActiveCampaigners(now: DateTime) {
  const twoDaysAgo = now.minus({ days: 2 });

  return EmailCampaignModel.findAll({
    include: [UserModel],
    where: {
      campaign: campaignName,
      [Op.or]: [
        {
          stage: 0
        },
        {
          stage: {
            [Op.gt]: 0,
            [Op.lt]: totalStages
          },
          sentAt: {
            [Op.lt]: twoDaysAgo.endOf('day').toJSDate()
          }
        }
      ]
    }
  });
}
