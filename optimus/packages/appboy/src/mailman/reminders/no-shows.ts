import { Topic, UnsubscribeGroups } from 'cl-common';
import {
  AttendanceModel,
  ClassModel,
  CourseModel,
  SessionModel,
  StudentModel,
  SubjectModel,
  TeacherModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import {
  ClassMaster,
  MsOps,
  Personalization,
  sendTemplatedEmail
} from '../../mailer';
import {
  createClassParams,
  createRecipient,
  createStudentParams,
  getSubjectUrl
} from '../../mailer-utils';

// teacher don't immediately tag attendances
// Get noshow tags happend in the last hour and filter out classes way passed
export async function getNoShowRecords(now: DateTime) {
  const dt = now.minus({ hours: 1 });
  const cutoff = dt.minus({ day: 2 }).toJSDate();

  return AttendanceModel.findAll({
    where: {
      statusCode: {
        [Op.lt]: 0
      },
      updatedAt: {
        [Op.gte]: dt.startOf('hour').toJSDate(),
        [Op.lt]: dt.endOf('hour').toJSDate()
      }
    },
    include: [
      StudentModel,
      {
        model: SessionModel,
        required: true,
        where: {
          startDate: {
            [Op.gt]: cutoff
          }
        },
        include: [
          {
            model: ClassModel.unscoped(),
            include: [
              TeacherModel,
              {
                model: CourseModel,
                include: [SubjectModel]
              }
            ]
          }
        ]
      }
    ]
  });
}

export async function sendNoShowReminder(now: DateTime) {
  const records = await getNoShowRecords(now);
  if (records.length === 0) {
    return;
  }

  const trialRecipients: Personalization[] = [];
  const scratchRecipients: Personalization[] = [];
  const paidRecipients: Personalization[] = [];

  for (const { student, session } of records) {
    const course = session.class.course;

    if (course.isRegular) {
      paidRecipients.push({
        to: createRecipient(student.parent),
        cc: session.class.teacher?.email,
        customArgs: {
          amp_user_id: student.parentId
        },
        dynamicTemplateData: {
          ...createStudentParams(student),
          ...createClassParams(session.class, course),
          classListingUrl: getSubjectUrl(course.subject),
          classIdx: session.idx + 1
        }
      });
    } else if (course.subjectId === Topic.SN) {
      scratchRecipients.push({
        to: createRecipient(student.parent),
        customArgs: {
          amp_user_id: student.parentId
        },
        dynamicTemplateData: {
          ...createStudentParams(student),
          ...createClassParams(session.class, course),
          classListingUrl: getSubjectUrl(course.subject)
        }
      });
    } else if (course.isTrial) {
      trialRecipients.push({
        to: createRecipient(student.parent),
        customArgs: {
          amp_user_id: student.parentId
        },
        dynamicTemplateData: {
          ...createStudentParams(student),
          ...createClassParams(session.class, course),
          classListingUrl: getSubjectUrl(course.subject)
        }
      });
    }
  }

  if (scratchRecipients.length > 0) {
    await sendTemplatedEmail(
      {
        templateId: 'd-bd564e4da3f943179fc010925ab7f4b0',
        asm: { groupId: UnsubscribeGroups.Classes },
        category: 'trial-noshow',
        from: MsOps,
        personalizations: scratchRecipients
      },
      {
        campaign: 'followup',
        source: 'noshow'
      }
    );
  }

  if (trialRecipients.length > 0) {
    await sendTemplatedEmail(
      {
        templateId: 'd-59a460eac4c44e269a939f723d9d2ce6',
        asm: { groupId: UnsubscribeGroups.Classes },
        category: 'trial-noshow',
        from: MsOps,
        personalizations: trialRecipients
      },
      {
        campaign: 'followup',
        source: 'noshow'
      }
    );
  }

  if (paidRecipients.length > 0) {
    await sendTemplatedEmail(
      {
        templateId: 'd-dc9cf4c90f9c47e6bf7358b833c56399',
        asm: { groupId: UnsubscribeGroups.Classes },
        from: ClassMaster,
        personalizations: paidRecipients
      },
      {
        campaign: 'followup',
        source: 'noshow'
      }
    );
  }
}
