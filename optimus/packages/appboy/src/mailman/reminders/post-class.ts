import { UnsubscribeGroups } from 'cl-common';
import {
  AttendanceModel,
  ClassModel,
  CourseModel,
  SessionModel,
  StudentModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import { format } from 'url';
import { MsOps, Personalization, sendTemplatedEmail } from '../../mailer';
import { createRecipient, createStudentParams, siteUrl } from '../../mailer-utils';

export async function sendReferralIntroduction(now: DateTime) {
  const dt = now.minus({ day: 1 });
  const attendants = await AttendanceModel.findAll({
    where: {
      statusCode: {
        [Op.gt]: 0
      }
    },
    include: [
      StudentModel,
      {
        model: SessionModel,
        required: true,
        where: {
          idx: 0,
          startDate: {
            [Op.between]: [dt.startOf('day').toJSON(), dt.endOf('day').toJSON()]
          }
        },
        include: [
          {
            model: ClassModel.unscoped(),
            include: [CourseModel]
          }
        ]
      }
    ]
  });

  const recipients: Personalization[] = [];
  for (const { student, session } of attendants) {
    if (session.class.course.isRegular && session.class.course.level === 1) {
      recipients.push({
        to: createRecipient(student.parent),
        customArgs: {
          amp_user_id: student.parentId
        },
        dynamicTemplateData: {
          ...createStudentParams(student),
          referralUrl: format({
            host: siteUrl.main,
            pathname: '/ref/' + student.parent.referralCode
          })
        }
      });
    }
  }

  if (recipients.length > 0) {
    await sendTemplatedEmail(
      {
        templateId: 'd-3352ee305cea4b90b83dd68443f3b76a',
        asm: { groupId: UnsubscribeGroups.Announcements },
        from: MsOps,
        personalizations: recipients,
        category: 'referral-program'
      },
      {
        campaign: 'referral',
        source: 'introduction'
      }
    );
  }
}
