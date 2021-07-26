"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudentParams = exports.createTeacherParams = exports.createUserParams = exports.createClassParams = exports.createRecipient = void 0;
const cl_common_1 = require("cl-common");
const fixtures_1 = require("cl-models/dist/fixtures");
exports.createRecipient = (user) => ({
    name: user.fullName,
    email: user.email
});
exports.createClassParams = (klass, course) => {
    const subject = fixtures_1.subjects[course.subjectId];
    return {
        dialInLink: klass.dialInLink,
        zoomId: klass.zoomId,
        classListingUrl: cl_common_1.getClassListingUrl(course.subjectId),
        courseName: course.name,
        subjectName: subject.name
    };
};
exports.createUserParams = (user) => ({
    first_name: user.firstName,
    last_name: user.lastName,
    full_name: user.fullName
});
exports.createTeacherParams = (teacher) => ({
    teacher_name: teacher.firstName,
    teacher_full: teacher.fullName,
    teacher_avatar: teacher.avatar || cl_common_1.defaultAvatarUrl,
    teacher_bio: teacher.bio || ''
});
exports.createStudentParams = (student) => {
    const params = {
        student_name: student.firstName,
        pronouns: student.gender === 'male'
            ? { nominative: 'he', objective: 'him', possessive: 'his' }
            : { nominative: 'she', objective: 'her', possessive: 'hers' }
    };
    return student.parent
        ? { ...params, ...exports.createUserParams(student.parent) }
        : params;
};
