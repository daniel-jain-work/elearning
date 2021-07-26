import {
  ClassModel,
  CourseModel,
  StudentModel,
  TeacherModel,
  UserModel
} from 'cl-models';

export const createRecipient = (user: UserModel | TeacherModel) => ({
  name: user.fullName,
  email: user.email
});

export const createClassParams = (klass: ClassModel, course: CourseModel) => ({
  dialInLink: klass.dialInLink,
  password: klass.password,
  zoomId: klass.zoomId,
  courseName: course.name
});

export const createUserParams = (user: UserModel) => ({
  first_name: user.firstName,
  last_name: user.lastName,
  full_name: user.fullName
});

export const createStudentParams = (student: StudentModel) => {
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
