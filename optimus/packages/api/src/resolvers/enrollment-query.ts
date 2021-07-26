import { TransactionOperation } from 'cl-common';
import {
  AttendanceModel,
  EnrollmentModel,
  SessionModel,
  TeacherModel
} from 'cl-models';
import { getCertificateUrl } from '../lib/url-utils';

export default {
  attribution(er: EnrollmentModel) {
    return `${er.source} ${er.campaign}`.trim();
  },

  async attendances(er: EnrollmentModel) {
    return AttendanceModel.findAll({
      where: {
        studentId: er.studentId
      },
      include: [
        {
          model: SessionModel,
          where: {
            classId: er.classId
          },
          required: true
        }
      ]
    });
  },

  async class(er: EnrollmentModel) {
    return (
      er.class ||
      er.getClass({
        include: [TeacherModel]
      })
    );
  },

  async credit(er: EnrollmentModel) {
    return er.credit || er.getCredit();
  },

  async sale(er: EnrollmentModel) {
    const ts = er.transactions || (await er.getTransactions());
    return ts.find(t => t.type === TransactionOperation.Sale);
  },

  async refund(er: EnrollmentModel) {
    const ts = er.transactions || (await er.getTransactions());
    return ts.find(t => t.type === TransactionOperation.Credit);
  },

  async student(er: EnrollmentModel) {
    return er.student || er.getStudent();
  },

  async promotion(er: EnrollmentModel) {
    return er.promotion || er.getPromotion();
  },

  certificateUrl(er: EnrollmentModel) {
    return getCertificateUrl(er);
  }
};
