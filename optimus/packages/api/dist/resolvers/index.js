"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mutation = void 0;
const graphql_iso_date_1 = require("graphql-iso-date");
const class_query_1 = require("./class-query");
const course_query_1 = require("./course-query");
const enrollment_query_1 = require("./enrollment-query");
const account_manager_1 = require("./mutations/account-manager");
const internal_ops_1 = require("./mutations/internal-ops");
const manage_articles_1 = require("./mutations/manage-articles");
const manage_attendance_1 = require("./mutations/manage-attendance");
const manage_blog_posts_1 = require("./mutations/manage-blog-posts");
const manage_classes_1 = require("./mutations/manage-classes");
const manage_classroom_1 = require("./mutations/manage-classroom");
const manage_email_templates_1 = require("./mutations/manage-email-templates");
const manage_enrollments_1 = require("./mutations/manage-enrollments");
const manage_files_1 = require("./mutations/manage-files");
const manage_fixtures_1 = require("./mutations/manage-fixtures");
const manage_notes_1 = require("./mutations/manage-notes");
const manage_partners_1 = require("./mutations/manage-partners");
const manage_promotions_1 = require("./mutations/manage-promotions");
const manage_students_1 = require("./mutations/manage-students");
const manage_teacher_profile_1 = require("./mutations/manage-teacher-profile");
const user_emails_1 = require("./mutations/user-emails");
const root_query_1 = require("./root-query");
const session_query_1 = require("./session-query");
const student_query_1 = require("./student-query");
const teacher_query_1 = require("./teacher-query");
const user_query_1 = require("./user-query");
exports.Mutation = {
    archiveArticle: manage_articles_1.archiveArticle,
    publishArticle: manage_articles_1.publishArticle,
    upsertCalendarEvent: manage_classes_1.upsertCalendarEvent,
    upsertZoomMeeting: manage_classes_1.upsertZoomMeeting,
    deleteZoomMeeting: manage_classes_1.deleteZoomMeeting,
    createClass: manage_classes_1.createClass,
    updateClass: manage_classes_1.updateClass,
    updateClassStatus: manage_classes_1.updateClassStatus,
    setClassObservers: manage_classes_1.setClassObservers,
    autoAssignTeacher: manage_classes_1.autoAssignTeacher,
    removeTeacherFromClass: manage_classes_1.removeTeacherFromClass,
    createCourse: manage_fixtures_1.createCourse,
    updateCourse: manage_fixtures_1.updateCourse,
    addStudentToClass: manage_enrollments_1.addStudentToClass,
    addStudentToSession: manage_enrollments_1.addStudentToSession,
    rescheduleRegistration: manage_enrollments_1.rescheduleRegistration,
    removeStudentFromSession: manage_enrollments_1.removeStudentFromSession,
    cancelRegistration: manage_enrollments_1.cancelRegistration,
    partialRefund: manage_enrollments_1.partialRefund,
    updateEnrollmentsStatus: manage_attendance_1.updateEnrollmentsStatus,
    updateStudentsAttendance: manage_attendance_1.updateStudentsAttendance,
    sendFollowupEmail: user_emails_1.sendFollowupEmail,
    sendClassConfirmationEmail: user_emails_1.sendClassConfirmationEmail,
    removeEmailTemplate: manage_email_templates_1.removeEmailTemplate,
    updateEmailTemplate: manage_email_templates_1.updateEmailTemplate,
    createTeacher: manage_teacher_profile_1.createTeacher,
    removeTeacher: manage_teacher_profile_1.removeTeacher,
    editTeacherProfile: manage_teacher_profile_1.editTeacherProfile,
    setTeacherBlackoutDate: manage_teacher_profile_1.setTeacherBlackoutDate,
    clearTeacherBlackoutDate: manage_teacher_profile_1.clearTeacherBlackoutDate,
    updateTeacherAvailability: manage_teacher_profile_1.updateTeacherAvailability,
    syncWorkingHours: internal_ops_1.syncWorkingHours,
    editStudentProfile: manage_students_1.editStudentProfile,
    updatePromotion: manage_promotions_1.updatePromotion,
    createPromotion: manage_promotions_1.createPromotion,
    updateBlogPost: manage_blog_posts_1.updateBlogPost,
    createBlogPost: manage_blog_posts_1.createBlogPost,
    addComment: manage_classroom_1.addComment,
    deleteComment: manage_classroom_1.deleteComment,
    addThread: manage_classroom_1.addThread,
    deleteThread: manage_classroom_1.deleteThread,
    addNoteToClass: manage_notes_1.addNoteToClass,
    addNoteToStudent: manage_notes_1.addNoteToStudent,
    addNoteToTeacher: manage_notes_1.addNoteToTeacher,
    removeNote: manage_notes_1.removeNote,
    getFileUploadUrl: manage_files_1.getFileUploadUrl,
    createPartner: manage_partners_1.createPartner,
    updatePartner: manage_partners_1.updatePartner,
    // account
    changePassword: account_manager_1.changePassword,
    userLogin: account_manager_1.userLogin,
    tagUserGeolocation: account_manager_1.tagUserGeolocation,
    // internal ops
    attributePurchase: internal_ops_1.attributePurchase,
    issueCredit: internal_ops_1.issueCredit,
    backfillReferral: internal_ops_1.backfillReferral,
    backfillPayment: internal_ops_1.backfillPayment,
    createBackfill: internal_ops_1.createBackfill,
    mergeStudentRecords: internal_ops_1.mergeStudentRecords,
    takeDownConflicts: internal_ops_1.takeDownConflicts,
    runCronTask: internal_ops_1.runCronTask
};
exports.default = {
    Date: graphql_iso_date_1.GraphQLDate,
    DateTime: graphql_iso_date_1.GraphQLDateTime,
    Class: class_query_1.default,
    Course: course_query_1.default,
    Subject: {
        courses(s) {
            return s.courses.filter(c => c.level >= 0);
        }
    },
    Enrollment: enrollment_query_1.default,
    Student: student_query_1.default,
    Session: session_query_1.default,
    Teacher: teacher_query_1.default,
    User: user_query_1.default,
    Query: root_query_1.default,
    Mutation: exports.Mutation
};
