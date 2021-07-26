import { TimeRange } from '@cl/types';
import { ClassModel, SessionModel, SubjectModel, ZoomhostModel } from 'cl-models';
import { GraphQLDate, GraphQLDateTime } from 'graphql-iso-date';
import { getSubjectUrl } from '../lib/url-utils';
import ClassQuery from './class-query';
import CourseQuery from './course-query';
import EnrollmentQuery from './enrollment-query';
import {
  changePassword,
  tagUserGeolocation,
  userLogin
} from './mutations/account-manager';
import {
  attributePurchase,
  backfillReferral,
  createBackfill,
  issueCredit,
  mergeStudentRecords,
  syncWorkingHours,
  takeDownConflicts
} from './mutations/internal-ops';
import { archiveArticle, publishArticle } from './mutations/manage-articles';
import {
  updateEnrollmentsStatus,
  updateStudentsAttendance
} from './mutations/manage-attendance';
import { createBlogPost, updateBlogPost } from './mutations/manage-blog-posts';
import {
  autoAssignTeacher,
  createClass,
  deleteZoomMeeting,
  removeTeacherFromClass,
  requestReassign,
  setClassObservers,
  updateClass,
  updateClassStatus,
  upsertCalendarEvent,
  upsertZoomMeeting
} from './mutations/manage-classes';
import {
  addComment,
  addThread,
  deleteComment,
  deleteThread
} from './mutations/manage-classroom';
import {
  removeEmailTemplate,
  updateEmailTemplate
} from './mutations/manage-email-templates';
import {
  addStudentToClass,
  addStudentToSession,
  cancelRegistration,
  refundPurchase,
  removeStudentFromSession,
  rescheduleRegistration
} from './mutations/manage-enrollments';
import { generateQRCode, getFileUploadUrl } from './mutations/manage-files';
import {
  createCourse,
  updateCourse,
  updateSubject
} from './mutations/manage-fixtures';
import {
  addNoteToClass,
  addNoteToStudent,
  addNoteToTeacher,
  removeNote
} from './mutations/manage-notes';
import { createPartner, updatePartner } from './mutations/manage-partners';
import { updateProject } from './mutations/manage-projects';
import { createPromotion, updatePromotion } from './mutations/manage-promotions';
import { editStudentProfile } from './mutations/manage-students';
import {
  createTeacher,
  editTeacherProfile,
  removeTeacher,
  removeTeacherTimeOff,
  setTeacherTimeOff,
  updateTeacherAvailability,
  updateTeacherTimeOff
} from './mutations/manage-teacher-profile';
import {
  sendClassConfirmationEmail,
  sendFollowupEmail
} from './mutations/user-emails';
import ProjectQuery from './project-query';
import Query from './root-query';
import SessionQuery from './session-query';
import StudentQuery from './student-query';
import TeacherQuery, { getClassTimeFilter } from './teacher-query';
import UserQuery from './user-query';

export const Mutation = {
  archiveArticle,
  publishArticle,

  upsertCalendarEvent,
  upsertZoomMeeting,
  deleteZoomMeeting,

  createClass,
  updateClass,
  updateClassStatus,
  setClassObservers,
  autoAssignTeacher,
  removeTeacherFromClass,
  requestReassign,

  createCourse,
  updateCourse,
  updateSubject,

  addStudentToClass,
  addStudentToSession,
  rescheduleRegistration,
  removeStudentFromSession,
  cancelRegistration,
  refundPurchase,

  updateEnrollmentsStatus,
  updateStudentsAttendance,

  sendFollowupEmail,
  sendClassConfirmationEmail,

  removeEmailTemplate,
  updateEmailTemplate,

  createTeacher,
  removeTeacher,
  editTeacherProfile,
  updateTeacherAvailability,
  setTeacherTimeOff,
  updateTeacherTimeOff,
  removeTeacherTimeOff,

  editStudentProfile,

  updatePromotion,
  createPromotion,

  updateBlogPost,
  createBlogPost,

  addComment,
  deleteComment,
  addThread,
  deleteThread,

  addNoteToClass,
  addNoteToStudent,
  addNoteToTeacher,
  removeNote,

  getFileUploadUrl,
  generateQRCode,

  createPartner,
  updatePartner,

  updateProject,

  // account
  changePassword,
  userLogin,
  tagUserGeolocation,

  // internal ops
  attributePurchase,
  issueCredit,
  backfillReferral,
  createBackfill,
  mergeStudentRecords,
  takeDownConflicts,
  syncWorkingHours
};

export default {
  Date: GraphQLDate,
  DateTime: GraphQLDateTime,
  Class: ClassQuery,
  Course: CourseQuery,
  Project: ProjectQuery,
  Enrollment: EnrollmentQuery,
  Student: StudentQuery,
  Session: SessionQuery,
  Teacher: TeacherQuery,
  User: UserQuery,

  Subject: {
    listingUrl(s: SubjectModel) {
      return getSubjectUrl(s);
    },

    courses(s: SubjectModel) {
      return s.courses.filter(c => c.level >= 0);
    }
  },

  Zoomhost: {
    async sessions(z: ZoomhostModel, args: TimeRange) {
      return SessionModel.findAll({
        where: getClassTimeFilter(args),
        include: [
          {
            model: ClassModel,
            required: true,
            where: {
              zoomhostId: z.id
            }
          }
        ]
      });
    }
  },

  Query,
  Mutation
};
