"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KlassFragment = exports.TeacherFragment = exports.StudentFragment = exports.UserFragment = void 0;
const api_client_1 = require("./api-client");
exports.UserFragment = api_client_1.gql `
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
exports.StudentFragment = api_client_1.gql `
  ${exports.UserFragment}
  fragment StudentFragment on Student {
    id
    firstName
    parent {
      ...UserFragment
    }
  }
`;
exports.TeacherFragment = api_client_1.gql `
  fragment TeacherFragment on Teacher {
    id
    firstName
    fullName
    email
    phoneNumber
    timezone
  }
`;
exports.KlassFragment = api_client_1.gql `
  ${exports.TeacherFragment}
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
