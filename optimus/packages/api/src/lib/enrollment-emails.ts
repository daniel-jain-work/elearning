import { AttachmentData } from '@sendgrid/helpers/classes/attachment';
import { Topic, UnsubscribeGroups } from 'cl-common';
import { ClassModel, CourseModel, StudentModel, TransactionModel } from 'cl-models';
import { DateTime } from 'luxon';
import { createInvoice } from './invoice-tpl';
import { ClassMaster, sendTemplatedEmail } from './mailer';
import {
  createClassParams,
  createRecipient,
  createStudentParams
} from './mailer-utils';

export async function sendAddonConfirmation(
  student: StudentModel,
  klass: ClassModel,
  course: CourseModel,
  idx: number
) {
  const tzOpts = { zone: student.parent.timezone };

  await sendTemplatedEmail({
    templateId: 'd-19a8d14657864654aebe81a6648ed41f',
    from: ClassMaster,
    to: createRecipient(student.parent),
    asm: { groupId: UnsubscribeGroups.Classes },
    category: 'confirmation',
    customArgs: {
      amp_user_id: student.parentId
    },
    dynamicTemplateData: {
      ...createClassParams(klass, course),
      ...createStudentParams(student),
      session: idx + 1,
      classTime: DateTime.fromJSDate(klass.schedules[idx][0], tzOpts).toFormat(
        'ffff'
      )
    }
  });
}

export async function sendRescheduleConfirmation(
  student: StudentModel,
  klass: ClassModel,
  course: CourseModel
) {
  const tzOpts = { zone: student.parent.timezone };

  await sendTemplatedEmail({
    templateId: 'd-26875caca1f34e4891170dddeff1e269',
    from: ClassMaster,
    to: createRecipient(student.parent),
    category: 'confirmation',
    customArgs: {
      amp_user_id: student.parentId
    },
    dynamicTemplateData: {
      ...createClassParams(klass, course),
      ...createStudentParams(student),
      classTime: DateTime.fromJSDate(klass.startDate, tzOpts).toFormat('t ZZZZZ'),
      classDates: klass.schedules
        .map(schedule => DateTime.fromJSDate(schedule[0], tzOpts).toFormat('LLL d'))
        .join(', ')
    }
  });
}

export async function sendRegistrationConfirmation(
  student: StudentModel,
  klass: ClassModel,
  course: CourseModel,
  transaction?: TransactionModel
) {
  const tzOpts = { zone: student.parent.timezone };
  const startTime = DateTime.fromJSDate(klass.startDate, tzOpts);

  if (course.isRegular) {
    const attachments: AttachmentData[] = [];
    if (transaction) {
      const invoiceHtml = await createInvoice(student, transaction);
      const invoiceContent = Buffer.from(invoiceHtml, 'utf-8');
      attachments.push({
        content: invoiceContent.toString('base64'),
        filename: 'receipt.html'
      });
    }

    await sendTemplatedEmail({
      templateId: 'd-396838b0f3cc4d72b3648903f00a577b',
      from: ClassMaster,
      to: createRecipient(student.parent),
      attachments,
      customArgs: {
        amp_user_id: student.parentId
      },
      dynamicTemplateData: {
        ...createClassParams(klass, course),
        ...createStudentParams(student),
        classTime: startTime.toFormat('t ZZZZZ'),
        classDates: klass.schedules
          .map(schedule =>
            DateTime.fromJSDate(schedule[0], tzOpts).toFormat('LLL d')
          )
          .join(', ')
      }
    });
  } else {
    await sendTemplatedEmail({
      templateId:
        course.subjectId === Topic.PARTNERS
          ? 'd-313254f7b73b422199d0af7c4769b0ba'
          : 'd-76e26f7b26434284b0498d2a52dac909',
      from: ClassMaster,
      to: createRecipient(student.parent),
      customArgs: {
        amp_user_id: student.parentId
      },
      dynamicTemplateData: {
        classTime: startTime.toFormat('ffff'),
        ...createClassParams(klass, course),
        ...createStudentParams(student)
      }
    });
  }
}
