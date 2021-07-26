import { Availability } from '@cl/types';
import gql from 'graphql-tag';
import {
  ClassFragment,
  Course,
  CourseFragment,
  EmailTemplate,
  EmailTemplateFragment,
  Student,
  StudentFragment,
  StudentWithClasses,
  Teacher,
  TeacherFragment
} from './data-types';

const TeacherProfileFragment = gql`
  ${TeacherFragment}
  fragment TeacherProfileFragment on Teacher {
    ...TeacherFragment
    lastName
    bio
    phoneNumber
    timezone
    experiences
    availableTime {
      day
      times
    }
  }
`;

export interface TeacherProfile extends Teacher {
  lastName: string;
  timezone: string;
  bio?: string;
  phoneNumber?: string;
  availableTime: Availability[];
  experiences: string[];
}

export const TeacherProfileQuery = gql`
  ${TeacherProfileFragment}
  query($id: ID!) {
    teacher(id: $id) {
      ...TeacherProfileFragment
    }
  }
`;

export const EditTeacherMutation = gql`
  ${TeacherProfileFragment}
  mutation(
    $id: ID!
    $firstName: String!
    $lastName: String!
    $bio: String
    $avatar: FileInput
    $phoneNumber: String
    $timezone: String
    $experiences: [String]
  ) {
    editTeacherProfile(
      id: $id
      firstName: $firstName
      lastName: $lastName
      bio: $bio
      avatar: $avatar
      timezone: $timezone
      phoneNumber: $phoneNumber
      experiences: $experiences
    ) {
      ...TeacherProfileFragment
    }
  }
`;

export const UpdateAvailabilitiesMutation = gql`
  ${TeacherProfileFragment}
  mutation($teacherId: ID!, $availabilities: [AvailableTimeInput]!) {
    updateTeacherAvailability(
      teacherId: $teacherId
      availabilities: $availabilities
    ) {
      ...TeacherProfileFragment
    }
  }
`;

export interface TeacherWithCoursesResult {
  teacher: {
    id: string;
    courses: Course[];
  };
}

export const TeacherWithCoursesQuery = gql`
  ${CourseFragment}

  query($teacherId: ID!) {
    teacher(id: $teacherId) {
      id
      courses {
        ...CourseFragment
      }
    }
  }
`;

export interface UpdateGenderData {
  editStudentProfile: Pick<Student, 'id' | 'gender'>;
}

export const UpdateGenderMutation = gql`
  mutation($id: ID!, $gender: Gender) {
    editStudentProfile(id: $id, gender: $gender) {
      id
      gender
    }
  }
`;

export const ClassStudentsHistoryQuery = gql`
  ${StudentFragment}
  ${ClassFragment}

  query($id: ID!, $from: DateTime) {
    class(id: $id) {
      id
      students {
        ...StudentFragment
        classes(from: $from, official: true) {
          ...ClassFragment
        }
      }
    }
  }
`;

export interface ClassStudentsHistoryResult {
  class: {
    id: string;
    students: StudentWithClasses[];
  };
}

export interface GetEmailTemplatesResult {
  tpls: EmailTemplate[];
}

export const GetEmailTemplatesQuery = gql`
  ${EmailTemplateFragment}
  query($teacherId: ID!, $subjectId: ID) {
    tpls: teacherEmailTemplates(teacherId: $teacherId, subjectId: $subjectId) {
      ...EmailTemplateFragment
    }
  }
`;

export interface SaveEmailTemplateData {
  tpl: EmailTemplate;
}
export const SaveEmailTemplateMutation = gql`
  ${EmailTemplateFragment}
  mutation(
    $id: ID
    $teacherId: ID!
    $name: String!
    $html: String!
    $subject: String!
  ) {
    tpl: updateEmailTemplate(
      id: $id
      teacherId: $teacherId
      name: $name
      html: $html
      subject: $subject
    ) {
      ...EmailTemplateFragment
    }
  }
`;

export const RemoveEmailTemplateMutation = gql`
  mutation($id: ID!) {
    removeEmailTemplate(id: $id)
  }
`;

export const SendFollowupEmailMutation = gql`
  mutation(
    $classId: ID!
    $studentId: ID!
    $subject: String!
    $html: String!
    $attachments: [FileInput]
  ) {
    sendFollowupEmail(
      classId: $classId
      studentId: $studentId
      subject: $subject
      html: $html
      attachments: $attachments
    )
  }
`;

export const ChangePasswordMutation = gql`
  mutation($id: ID!, $previous: String, $password: String!) {
    changePassword(id: $id, previous: $previous, password: $password)
  }
`;

export const RequestReassignMutation = gql`
  ${TeacherFragment}
  mutation($classId: ID!, $reason: String) {
    requestReassign(classId: $classId, reason: $reason) {
      id
      teacherId
      teacher {
        ...TeacherFragment
      }
    }
  }
`;
