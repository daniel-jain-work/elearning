"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassListingUrl = exports.getAdminUserUrl = exports.getAdminClassUrl = exports.opsSite = exports.mainSite = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const config = require("config");
const url_1 = require("url");
exports.mainSite = config.get('siteUrls.main');
exports.opsSite = config.get('siteUrls.operations');
function getAdminClassUrl(klass) {
    return url_1.format({
        host: exports.opsSite,
        pathname: '/classes/' + klass.id
    });
}
exports.getAdminClassUrl = getAdminClassUrl;
function getAdminUserUrl(people) {
    return url_1.format({
        host: exports.opsSite,
        pathname: '/users/' + (people instanceof cl_models_1.StudentModel ? people.parentId : people.id)
    });
}
exports.getAdminUserUrl = getAdminUserUrl;
function getClassListingUrl(subjectId) {
    return url_1.format({
        host: exports.mainSite,
        pathname: cl_common_1.topicRoutes[subjectId] || '/topic/' + subjectId
    });
}
exports.getClassListingUrl = getClassListingUrl;
