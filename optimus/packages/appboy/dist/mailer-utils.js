"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudentParams = exports.createUserParams = exports.createClassParams = exports.createRecipient = exports.getSubjectUrl = exports.siteUrl = void 0;
const config = require("config");
const url_1 = require("url");
exports.siteUrl = config.get('siteUrl');
exports.getSubjectUrl = (s) => url_1.format({
    host: exports.siteUrl.main,
    pathname: s.pathname
});
exports.createRecipient = (user) => ({
    name: user.fullName,
    email: user.email
});
exports.createClassParams = (klass, course) => {
    var _a;
    return ({
        dialInLink: klass.dialInLink,
        zoomId: klass.zoomId,
        password: klass.password,
        courseName: course.name,
        subjectName: ((_a = course.subject) === null || _a === void 0 ? void 0 : _a.name) || course.name
    });
};
exports.createUserParams = (user) => ({
    first_name: user.firstName,
    last_name: user.lastName,
    full_name: user.fullName
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
