import { Graphql, Schedules } from '@cl/types';
import { Topic } from 'cl-common';
import { gql } from './api-client';

export const UserFragment = gql`
  fragment UserFragment on User {
    id
    email
    firstName
    lastName
    fullName
    timezone
    refererId
  }
`;
export interface User extends Graphql.IdArgs {
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  timezone: string;
  refererId?: string;
}

export const StudentFragment = gql`
  ${UserFragment}
  fragment StudentFragment on Student {
    id
    firstName
    parent {
      ...UserFragment
    }
  }
`;

export interface Student extends Graphql.IdArgs {
  firstName: string;
  parent: User;
}

export interface Teacher extends Graphql.IdArgs {
  firstName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  timezone?: string;
}
export const TeacherFragment = gql`
  fragment TeacherFragment on Teacher {
    id
    firstName
    fullName
    email
    phoneNumber
    timezone
  }
`;

export interface Klass extends Graphql.IdArgs {
  dialInLink: string;
  password: string;
  zoomId: string;
  startDate: string;
  endDate: string;
  schedules: Schedules;
  course: Graphql.IdArgs & {
    name: string;
    capacity: number;
    level: number;
    subjectId: Topic;
    isTrial: boolean;
    isRegular: boolean;
    subject: {
      name: string;
      listingUrl: string;
    };
  };
  teacher: Teacher;
}

export const KlassFragment = gql`
  ${TeacherFragment}
  fragment KlassFragment on Class {
    id
    dialInLink
    password
    zoomId
    startDate
    endDate
    schedules
    course {
      id
      name
      capacity
      level
      subjectId
      isTrial
      isRegular
      subject {
        name
        listingUrl
      }
    }
    teacher {
      ...TeacherFragment
    }
  }
`;
