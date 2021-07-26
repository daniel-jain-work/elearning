import {
  ClassModel,
  EnrollmentModel,
  SubjectModel,
  TeacherModel,
  UserModel
} from 'cl-models';
import * as config from 'config';
import { format } from 'url';

export const siteUrl = config.get('siteUrl') as {
  ops: string;
  teaching: string;
  main: string;
};

export const getOpsClassUrl = (c: ClassModel) =>
  format({
    host: siteUrl.ops,
    pathname: '/classes/' + c.id
  });

export const getOpsUserUrl = (u: UserModel) =>
  format({
    host: siteUrl.ops,
    pathname: '/users/' + u.id
  });

export const getOpsTeacherUrl = (t: TeacherModel) =>
  format({
    host: siteUrl.ops,
    pathname: '/teachers/' + t.id
  });

export const getSubjectUrl = (s: SubjectModel) =>
  format({
    host: siteUrl.main,
    pathname: s.pathname
  });

export const getEnrollClassUrl = (c: ClassModel) =>
  format({
    host: siteUrl.main,
    pathname: '/enroll/class/' + c.id
  });

export const getClassroomUrl = (c: ClassModel) =>
  format({
    host: siteUrl.main,
    pathname: '/classroom/' + c.id
  });

export const getCertificateUrl = (er: EnrollmentModel) =>
  format({
    host: siteUrl.main,
    pathname: `/print-certificate/${er.studentId}/${er.classId}`
  });
