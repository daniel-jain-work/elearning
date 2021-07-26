import { Topic } from 'cl-common';
import { Graphql } from './index';

export type Nullable<T> = T | null;
export type Schedules = [string, string][];
export interface Availability {
  day: number;
  times: [number, number][];
}

export interface WebEvent {
  type: string;
  ts?: string;
  dry?: boolean;
  range?: number;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export interface FileInput {
  name: string;
  content: string;
}

export interface TokenPayload extends Graphql.UserIdArgs, Graphql.TeacherIdArgs {
  email: string;
  isAdmin: boolean;
  isOps: boolean;
}

// basic model types

export interface ClassLite {
  id: string;
  courseId: string;
  startDate: string;
  endDate: string;
}

export interface CourseLite {
  id: string;
  subjectId: Topic;
  name: string;
}

export interface StudentLite {
  id: string;
  name: string;
  avatar?: string;
  age?: number;
  gender?: string;
}

export interface Seat<T extends StudentLite> {
  id: string;
  student: T;
  addedOn?: boolean;
  movedOut?: boolean;
  statusCode: number;
}

export interface ClassActivityLog {
  id: string;
  createdAt: string;
  identity: string;
  message: string;
}

export interface Author extends Graphql.IdArgs {
  name: string;
  avatar?: string;
}

export interface TimeOff {
  id: string;
  start: Date;
  end: Date;
}