import { UnsubscribeGroups } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  PromotionModel,
  SessionModel,
  StudentModel,
  SubjectModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import { format } from 'url';
import logger from '../../logger';
import { ClassMaster, Personalization, sendTemplatedEmail } from '../../mailer';
import {
  createClassParams,
  createRecipient,
  createStudentParams,
  getSubjectUrl,
  siteUrl
} from '../../mailer-utils';

// for student finishing up session 3 with no followup class, send promo
// for student finishing up session 4 with no followup, notify ops
// for student finishing up sessino 4 send ceritificate
export async function sendPaidFollowups(now: DateTime) {
  const dt = now.minus({ day: 1 });
  const sessions = await SessionModel.findAll({
    where: {
      idx: {
        [Op.in]: [2, 3]
      },
      endDate: {
        [Op.between]: [dt.startOf('day').toJSON(), dt.endOf('day').toJSON()]
      }
    },
    include: [
      {
        model: StudentModel,
        required: true,
        include: [ClassModel]
      },
      {
        model: ClassModel,
        where: {
          active: true,
          teacherId: { [Op.not]: null }
        },
        required: true,
        include: [
          {
            model: CourseModel,
            include: [PromotionModel, SubjectModel]
          }
        ]
      }
    ]
  });

  const promoRecipients: Personalization[] = [];
  const certificateRecipients: Personalization[] = [];

  for (const ses of sessions) {
    const course = ses.class.course;

    if (ses.class.schedules.length !== 4 || !course.isRegular) {
      logger.info('non-regular class, skip');
      continue;
    }

    if (ses.idx === 2 && course.level < course.subject.exitLevel) {
      const promo = course.promotions.find(promo => promo.isValid);
      if (promo) {
        for (const student of ses.students) {
          if (hasRenewed(ses.class, student)) {
            logger.info('student has already purchased next level class, skip');
            continue;
          }

          promoRecipients.push({
            to: createRecipient(student.parent),
            customArgs: {
              amp_user_id: student.parentId
            },
            dynamicTemplateData: {
              offer: {
                code: promo.code,
                rules: promo.description
              },
              offerSignupUrl: getSubjectUrl(course.subject),
              ...createStudentParams(student),
              ...createClassParams(ses.class, course)
            }
          });
        }
      }
    }

    if (ses.idx === 3) {
      for (const student of ses.students) {
        certificateRecipients.push({
          to: createRecipient(student.parent),
          customArgs: {
            amp_user_id: student.parentId
          },
          dynamicTemplateData: {
            certificateUrl: format({
              host: siteUrl.main,
              pathname: '/request-certificate',
              query: {
                key: Buffer.from(`${student.id}:${ses.classId}`).toString('base64')
              }
            }),
            ...createStudentParams(student),
            ...createClassParams(ses.class, course)
          }
        });
      }
    }
  }

  if (promoRecipients.length > 0) {
    await sendTemplatedEmail(
      {
        templateId: 'd-cbcae941a6de431282dbfe85565209ee',
        asm: { groupId: UnsubscribeGroups.Classes },
        from: ClassMaster,
        personalizations: promoRecipients,
        category: 'paid-followup'
      },
      {
        campaign: 'followup',
        source: 'ses3'
      }
    );
  }

  if (certificateRecipients.length > 0) {
    await sendTemplatedEmail(
      {
        templateId: 'd-66b778570bd745beb388300003ab252f',
        asm: { groupId: UnsubscribeGroups.Classes },
        from: ClassMaster,
        personalizations: certificateRecipients,
        category: 'paid-followup'
      },
      {
        campaign: 'followup',
        source: 'ses4'
      }
    );
  }
}

function hasRenewed(klass: ClassModel, student: StudentModel) {
  for (const c of student.classes) {
    if (c.endDate > klass.endDate && klass.course.isRegular) {
      return true;
    }
  }
  return false;
}
