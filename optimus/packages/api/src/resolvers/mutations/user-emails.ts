import { Graphql } from '@cl/types';
import { emailDomain, TransactionOperation } from 'cl-common';
import {
  ClassModel,
  EnrollmentModel,
  StudentModel,
  TeacherModel,
  TransactionModel
} from 'cl-models';
import * as dataUrls from 'data-urls';
import { SendMailOptions } from 'nodemailer';
import { GraphqlContext } from '../../graphql-handler';
import { sesTransporter } from '../../lib/aws';
import { catalogStore } from '../../lib/dataloader';
import {
  sendRegistrationConfirmation,
  sendRescheduleConfirmation
} from '../../lib/enrollment-emails';
import { ClassMaster, MsOps } from '../../lib/mailer';

export async function sendClassConfirmationEmail(
  _,
  args: Graphql.SendClassConfirmationEmailVars
) {
  const er = await EnrollmentModel.findByPk(args.id, {
    rejectOnEmpty: true,
    include: [
      { model: ClassModel, required: true },
      { model: StudentModel, required: true },
      TransactionModel
    ]
  });

  const course = await catalogStore.getCourseById(er.class.courseId);

  if (args.isReschedule) {
    await sendRescheduleConfirmation(er.student, er.class, course);
  } else {
    await sendRegistrationConfirmation(
      er.student,
      er.class,
      course,
      er.transactions.find(t => t.type === TransactionOperation.Sale)
    );
  }

  return true;
}

export async function sendFollowupEmail(
  _,
  args: Graphql.SendFollowupEmailArgs,
  ctx: GraphqlContext
) {
  const klass = await ClassModel.findByPk(args.classId, {
    rejectOnEmpty: true,
    include: [TeacherModel]
  });

  ctx.ownerOrInternal(klass.teacherId);

  const data = getMailData(args);

  if (args.studentId) {
    const student = await StudentModel.findByPk(args.studentId, {
      rejectOnEmpty: true
    });

    data.to = {
      name: student.parent.fullName,
      address: student.parent.email
    };

    if (klass.teacher) {
      data.cc = klass.teacher.email;
      // class teacher sends email
      if (klass.teacher.email.endsWith(emailDomain)) {
        data.from = klass.teacher.email;
      } else {
        data.replyTo = klass.teacher.email;
      }
    }
  } else {
    const students = await klass.getStudents();
    data.to = MsOps;
    data.bcc = Array.from(
      new Set(students.map(student => student.parent.email)).values()
    );
  }

  await sesTransporter.sendMail(data);

  return true;
}

function getMailData(args: Graphql.SendFollowupEmailArgs) {
  const data: SendMailOptions = {
    from: ClassMaster,
    subject: args.subject,
    html: args.html
  };

  if (args.attachments && args.attachments.length > 0) {
    data.attachments = args.attachments.map(file => {
      const data = dataUrls(file.content).body;
      return {
        content: data.toString('base64'),
        encoding: 'base64',
        filename: file.name
      };
    });
  }

  return data;
}
