import { Seat, TimeOff, Availability } from '@cl/types';
import gql from 'graphql-tag';
import {
  Class,
  ClassDetails,
  ClassDetailsFragment,
  ClassFragment,
  Session,
  SessionClass,
  SessionClassFragment,
  SessionFragment,
  Student,
  StudentFragment,
  Teacher,
  TeacherFragment
} from './data-types';

export interface TeacherAssignmentsResult {
  teacher: Teacher & {
    timezone: string;
    availableTime: Availability[];
    sessions: SessionClass[];
    timeoffs: TimeOff[];
  };
}

export const TeacherAssignmentsQuery = gql`
  ${TeacherFragment}
  ${SessionClassFragment}
  query($teacherId: ID!, $from: DateTime!, $to: DateTime!) {
    teacher(id: $teacherId) {
      ...TeacherFragment
      timezone
      timeoffs {
        id
        start
        end
      }
      availableTime {
        day
        times
      }
      sessions(from: $from, to: $to) {
        ...SessionClassFragment
      }
    }
  }
`;

export interface ClassRosterResult {
  class: ClassDetails & {
    enrollments: {
      id: string;
      status: string;
      statusCode: number;
      student: Student;
    }[];
  };
}

export const ClassRosterQuery = gql`
  ${ClassDetailsFragment}
  ${StudentFragment}
  query($id: ID!) {
    class(id: $id) {
      ...ClassDetailsFragment
      enrollments {
        id
        status
        statusCode
        student {
          ...StudentFragment
        }
      }
    }
  }
`;

export interface SessionRosterResult {
  session: Session & {
    class: ClassDetails;
    roster: Seat<Student>[];
  };
}

export const SessionRosterQuery = gql`
  ${ClassDetailsFragment}
  ${SessionFragment}
  ${StudentFragment}
  query($id: ID!) {
    session(id: $id) {
      ...SessionFragment
      class {
        ...ClassDetailsFragment
      }
      roster {
        id
        addedOn
        movedOut
        statusCode
        student {
          ...StudentFragment
        }
      }
    }
  }
`;

export const UpdateStudentsAttendanceMutation = gql`
  mutation($sessionId: ID!, $students: [ID]!, $statusCodes: [Int]!) {
    updateStudentsAttendance(
      sessionId: $sessionId
      students: $students
      statusCodes: $statusCodes
    ) {
      id
      statusCode
    }
  }
`;

export const UpdateEnrollmentsStatusMutation = gql`
  mutation($classId: ID!, $students: [ID]!, $statusCodes: [Int]!) {
    updateEnrollmentsStatus(
      classId: $classId
      students: $students
      statusCodes: $statusCodes
    ) {
      id
      status
      statusCode
    }
  }
`;

export interface ClassSearchQueryResult {
  list: {
    offset: number;
    count: number;
    rows: Class[];
  };
}

export const ClassSearchQuery = gql`
  ${ClassFragment}
  query($timeRange: TimeRangeInput, $courseId: ID, $teacherId: ID) {
    list: classes(
      timeRange: $timeRange
      courseId: $courseId
      teacherId: $teacherId
    ) {
      count
      offset
      rows {
        ...ClassFragment
      }
    }
  }
`;
