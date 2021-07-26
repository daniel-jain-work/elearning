import {
  Author,
  ClassLite,
  CourseLite,
  Graphql,
  Schedules,
  StudentLite
} from '@cl/types';
import { Topic } from 'cl-common';
import gql from 'graphql-tag';

export interface Teacher extends Graphql.IdArgs {
  email: string;
  firstName: string;
  fullName: string;
  avatar: string;
}

export const TeacherFragment = gql`
  fragment TeacherFragment on Teacher {
    id
    email
    firstName
    fullName
    avatar
  }
`;

export interface Session {
  id: string;
  classId: string;
  idx: number;
  startDate: string;
  endDate: string;
}

export const SessionFragment = gql`
  fragment SessionFragment on Session {
    id
    classId
    idx
    startDate
    endDate
  }
`;

export interface Course extends CourseLite {
  description: string;
  grades: [number, number];
  thumbnail: string;
  deck?: string;
}

export const CourseFragment = gql`
  fragment CourseFragment on Course {
    id
    name
    description
    grades
    thumbnail
    subjectId
    deck
  }
`;

export interface SessionClass extends Session {
  students: Graphql.StudentIdArgs[];
  class: Graphql.IdArgs & {
    schedules: Schedules;
    course: Course;
  };
}

export const SessionClassFragment = gql`
  ${SessionFragment}
  ${CourseFragment}

  fragment SessionClassFragment on Session {
    ...SessionFragment
    students {
      id
    }
    class {
      id
      schedules
      course {
        ...CourseFragment
      }
    }
  }
`;

export interface Promotion {
  id: string;
  code: string;
  description: string;
}

export const PromotionFragment = gql`
  fragment PromotionFragment on Promotion {
    id
    code
    description
  }
`;
export interface Class extends ClassLite {
  active: boolean;
  sessions: Session[];
  teacherId: string;
  dialInLink: string;
  course: Course;
  editable: boolean;
}

export const ClassFragment = gql`
  ${SessionFragment}
  ${CourseFragment}
  fragment ClassFragment on Class {
    id
    active
    courseId
    startDate
    endDate
    teacherId
    dialInLink
    editable
    sessions {
      ...SessionFragment
    }
    course {
      ...CourseFragment
    }
  }
`;

export interface ClassDetails extends Class {
  teacher: Teacher;
  observers: Teacher[];
  course: Course & {
    isTrial: boolean;
    isRegular: boolean;
    offer?: Promotion;
  };
  meeting?: {
    id: string;
    hostId: string;
    startUrl: string;
  };
  schedules: [string, string][];
}

export const ClassDetailsFragment = gql`
  ${ClassFragment}
  ${TeacherFragment}
  ${SessionFragment}
  ${PromotionFragment}
  fragment ClassDetailsFragment on Class {
    ...ClassFragment
    course {
      isTrial
      isRegular
      offer {
        ...PromotionFragment
      }
    }
    meeting {
      id
      hostId
      startUrl
    }
    teacher {
      ...TeacherFragment
    }
    observers {
      ...TeacherFragment
    }
    schedules
  }
`;

export interface Student extends StudentLite {
  avatar: string;
  firstName: string;
  parent: {
    id: string;
    firstName: string;
    fullName: string;
  };
}

export const StudentFragment = gql`
  fragment StudentFragment on Student {
    id
    avatar
    name
    firstName
    age
    gender
    parent {
      id
      firstName
      fullName
    }
  }
`;

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  teacherId?: string;
}

export const EmailTemplateFragment = gql`
  fragment EmailTemplateFragment on EmailTemplate {
    id
    teacherId
    name
    subject
    html
  }
`;

export type ClassWithTeacher = Class & {
  teacher: Teacher;
};

export type StudentWithClasses = Student & {
  classes: Class[];
};

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

export const CommentFragment = gql`
  fragment CommentFragment on Comment {
    id
    content
    createdAt
    author {
      id
      name
      avatar
    }
  }
`;

export interface Thread {
  id: string;
  content: string;
  createdAt: string;
  comments: Comment[];
  attachments: string[];
  author: Author;
}

export const ThreadFragment = gql`
  ${CommentFragment}
  fragment ThreadFragment on Thread {
    id
    content
    createdAt
    attachments
    author {
      id
      name
      avatar
    }
    comments {
      ...CommentFragment
    }
  }
`;

interface SubjectLite {
  id: Topic;
  name: string;
}

export interface Project {
  id: string;
  url: string;
  preview: string;
  title: string;
  description: string;
  student: StudentLite;
  subject?: SubjectLite;
  featured?: number;
  updatedAt: string;
}

export const ProjectFragment = gql`
  ${StudentFragment}

  fragment ProjectFragment on Project {
    id
    url
    preview
    title
    description
    featured
    student {
      ...StudentFragment
    }
    subject {
      id
      name
    }
    updatedAt
  }
`;
