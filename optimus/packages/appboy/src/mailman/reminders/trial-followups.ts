import { UnsubscribeGroups } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  EnrollmentModel,
  StudentModel,
  UserModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import { MsOps, Personalization, sendTemplatedEmail } from '../../mailer';
import {
  createClassParams,
  createRecipient,
  createStudentParams
} from '../../mailer-utils';

const trialTemplates: Record<string, string> = {
  'data-science_0': 'd-1bdb827223d6476d99354defd685ac11',
  minecraft_0: 'd-0df3365099d6424d8c9fe1492e48ca85',
  'ai-explorers_0': 'd-fa08fd79770046aa9fddb99fadd5b77d',
  scratch_0: 'd-a78b8bd7b0184e16b335dd56fd9446fb',
  scratch_junior: 'd-a78b8bd7b0184e16b335dd56fd9446fb',
  ascratch_0: 'd-a78b8bd7b0184e16b335dd56fd9446fb'
};

async function getRecords(day: DateTime) {
  return EnrollmentModel.findAll({
    attributes: ['id'],
    where: {
      statusCode: 20
    },
    include: [
      {
        model: StudentModel.unscoped(),
        required: true,
        include: [
          {
            model: UserModel,
            as: 'parent',
            where: {
              paid: false
            }
          }
        ]
      },
      {
        model: ClassModel,
        required: true,
        include: [CourseModel],
        where: {
          courseId: {
            [Op.in]: Object.keys(trialTemplates)
          },
          endDate: {
            [Op.between]: [day.startOf('day').toJSON(), day.endOf('day').toJSON()]
          }
        }
      }
    ]
  });
}

export async function send2WeeksFollowups(now: DateTime) {
  const recipients: Record<string, Personalization[]> = {};

  for (const record of await getRecords(now.minus({ days: 14 }))) {
    const templateId = trialTemplates[record.class.courseId];

    if (!recipients[templateId]) {
      recipients[templateId] = [];
    }

    recipients[templateId].push({
      to: createRecipient(record.student.parent),
      customArgs: { amp_user_id: record.student.parentId },
      dynamicTemplateData: {
        ...createStudentParams(record.student),
        ...createClassParams(record.class, record.class.course)
      }
    });
  }

  for (const templateId of Object.keys(recipients)) {
    await sendTemplatedEmail(
      {
        from: MsOps,
        templateId,
        category: 'trial-followup',
        personalizations: recipients[templateId],
        asm: {
          groupId: UnsubscribeGroups.Promotions
        }
      },
      {
        campaign: 'followup',
        source: '2wk'
      }
    );
  }
}
