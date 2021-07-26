import { UnsubscribeGroups } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  EnrollmentModel,
  PromotionModel,
  StudentModel,
  SubjectModel,
  TeacherModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import {
  EmailOpts,
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

export async function sendFollowupCoupons(now: DateTime) {
  const dt = now.minus({ hours: 2 });

  const records = await EnrollmentModel.findAll({
    attributes: ['id', 'updatedAt'],
    where: {
      statusCode: 20,
      updatedAt: {
        [Op.between]: [dt.startOf('hour').toJSON(), dt.endOf('hour').toJSON()]
      }
    },
    include: [
      {
        model: ClassModel.unscoped(),
        where: {
          endDate: {
            [Op.gt]: now.minus({ day: 1 }).toJSDate()
          }
        },
        include: [
          {
            model: TeacherModel,
            required: true
          },
          {
            model: CourseModel,
            where: { level: 0 },
            required: true,
            include: [PromotionModel, SubjectModel]
          }
        ]
      },
      {
        model: StudentModel,
        include: [
          {
            model: ClassModel.unscoped(),
            include: [CourseModel]
          }
        ]
      }
    ]
  });

  for (const { class: klass, student } of records) {
    const promo = klass.course.promotions.find(p => p.isValid);
    const hasUpgraded = student.classes.some(
      k => k.course.subjectId === klass.course.subjectId && k.course.level === 1
    );
    if (promo && !hasUpgraded) {
      await sendLevelUpCoupon(student, klass, promo);
    }
  }
}

async function sendLevelUpCoupon(
  student: StudentModel,
  klass: ClassModel,
  promo: PromotionModel
) {
  const emailOpts: EmailOpts = {
    from: MsOps,
    to: createRecipient(student.parent),
    asm: { groupId: UnsubscribeGroups.Promotions },
    templateId: '',
    category: 'trial-followup',
    customArgs: {
      amp_user_id: student.parentId
    }
  };

  const totalTrials = student.classes.filter(
    k => k.course.isTrial && k.startDate < new Date()
  ).length;

  if (student.parent.paid || totalTrials < 3) {
    emailOpts.templateId = 'd-94860ae256d7420e9ec83de967827a4a';
    emailOpts.dynamicTemplateData = {
      offer: {
        code: promo.code,
        rules: promo.description
      },
      ...createStudentParams(student),
      ...createClassParams(klass, klass.course),
      teacher_name: klass.teacher.firstName
    };
  } else {
    emailOpts.templateId = 'd-0c0ddcb9535f4342819222727aaa3f08';
    emailOpts.cc = MsOps;
    emailOpts.dynamicTemplateData = {
      ...createStudentParams(student),
      ...createClassParams(klass, klass.course)
    };
  }

  await sendTemplatedEmail(emailOpts, {
    source: 't2p',
    campaign: 'levelup'
  });
}

export async function sendCouponExpiringAlerts(now: DateTime) {
  const dt = now.minus({ hours: 46 });

  const records = await EnrollmentModel.findAll({
    attributes: ['id', 'updatedAt'],
    where: {
      statusCode: 20
    },
    include: [
      StudentModel,
      {
        model: ClassModel.unscoped(),
        where: {
          endDate: {
            [Op.between]: [dt.startOf('hour').toJSON(), dt.endOf('hour').toJSON()]
          }
        },
        include: [
          {
            model: TeacherModel,
            required: true
          },
          {
            model: CourseModel,
            where: { level: 0 },
            required: true,
            include: [PromotionModel, SubjectModel]
          }
        ]
      }
    ]
  });

  const recipients: Personalization[] = [];

  for (const record of records) {
    const { student, class: klass } = record;
    const promo = klass.course.promotions.find(p => p.isValid);
    if (student.parent.paid || !promo) {
      continue;
    }

    recipients.push({
      to: createRecipient(record.student.parent),
      customArgs: {
        amp_user_id: record.student.parentId
      },
      dynamicTemplateData: {
        offer: {
          code: promo.code,
          rules: promo.description
        },
        ...createClassParams(klass, klass.course),
        ...createStudentParams(student),
        teacher_name: klass.teacher.firstName
      }
    });
  }

  if (recipients.length > 0) {
    await sendTemplatedEmail(
      {
        from: MrReminder,
        personalizations: recipients,
        templateId: 'd-f60276406a3a437d928eee23a54fe9e6',
        category: 'trial-followup',
        asm: {
          groupId: UnsubscribeGroups.Promotions
        }
      },
      {
        source: 'expiring',
        campaign: 'followup'
      }
    );
  }
}
