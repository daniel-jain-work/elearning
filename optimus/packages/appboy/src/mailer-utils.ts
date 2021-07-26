import {
  ClassModel,
  CourseModel,
  StudentModel,
  SubjectModel,
  UserModel
} from 'cl-models';
import * as config from 'config';
import { format } from 'url';

type ClassType = Pick<ClassModel, 'id' | 'dialInLink' | 'zoomId' | 'password'>;
type CourseType = Pick<CourseModel, 'id' | 'name' | 'subjectId'> & {
  subject?: { name: string };
};

type UserType = Pick<
  UserModel,
  'id' | 'firstName' | 'lastName' | 'fullName' | 'email'
>;

type StudentType = Pick<StudentModel, 'id' | 'firstName' | 'gender'> & {
  parent: UserType;
};

export const siteUrl = config.get('siteUrl') as {
  ops: string;
  teaching: string;
  main: string;
};

export const getSubjectUrl = (s: SubjectModel) =>
  format({
    host: siteUrl.main,
    pathname: s.pathname
  });

export const createRecipient = (user: UserType) => ({
  name: user.fullName,
  email: user.email
});

export const createClassParams = (klass: ClassType, course: CourseType) => ({
  dialInLink: klass.dialInLink,
  zoomId: klass.zoomId,
  password: klass.password,
  courseName: course.name,
  subjectName: course.subject?.name || course.name
});

export const createUserParams = (user: UserType) => ({
  first_name: user.firstName,
  last_name: user.lastName,
  full_name: user.fullName
});

export const createStudentParams = (student: StudentType) => {
  const params = {
    student_name: student.firstName,
    pronouns:
      student.gender === 'male'
        ? { nominative: 'he', objective: 'him', possessive: 'his' }
        : { nominative: 'she', objective: 'her', possessive: 'hers' }
  };

  return student.parent
    ? { ...params, ...createUserParams(student.parent) }
    : params;
};
