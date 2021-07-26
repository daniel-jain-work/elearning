"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const dataloader_1 = require("../lib/dataloader");
const host_manager_1 = require("../lib/host-manager");
const teacher_utils_1 = require("../lib/teacher-utils");
const zoom_api_1 = require("../zoomtopia/zoom-api");
exports.default = {
    isCamp(c) {
        return c.sessions.length === 4 && c.days < cl_common_1.campClassMaxDays;
    },
    async addons(c) {
        return (c.addons ||
            c.getAddons({
                include: [cl_models_1.StudentModel]
            }));
    },
    course(c) {
        return c.course || dataloader_1.catalogStore.getCourseById(c.courseId);
    },
    // DEPRECATED, Google classroom link
    classroomLink(c) {
        return c.details['classroomLink'];
    },
    async enrollments(c) {
        const enrollments = c.enrollments ||
            (await c.getEnrollments({
                include: [cl_models_1.StudentModel]
            }));
        return enrollments.slice(0, 200);
    },
    async students(c) {
        const students = c.students || (await c.getStudents());
        return students.slice(0, 200);
    },
    async threads(c, _, ctx) {
        ctx.ownerOrInternal(c.teacherId);
        return c.getThreads({
            order: [
                ['createdAt', 'DESC'],
                [cl_models_1.CommentModel, 'createdAt', 'DESC']
            ],
            include: [
                cl_models_1.TeacherModel,
                cl_models_1.StudentModel.unscoped(),
                {
                    model: cl_models_1.CommentModel,
                    include: [cl_models_1.TeacherModel, cl_models_1.StudentModel.unscoped()]
                }
            ]
        });
    },
    async activityLogs(c) {
        const sessions = await c.getSessions({
            order: [[cl_models_1.ClassActivityLogModel, 'createdAt', 'ASC']],
            include: [cl_models_1.ClassActivityLogModel]
        });
        return sessions.map(s => s.classActivityLogs).flat();
    },
    async teacher(c) {
        if (c.teacher) {
            return c.teacher;
        }
        if (c.teacherId) {
            return dataloader_1.teacherStore.getById(c.teacherId);
        }
    },
    async observers(c) {
        return c.observers || c.getObservers();
    },
    async availableTeachers(c) {
        return teacher_utils_1.getAvailableTeachers(c);
    },
    async zoomhost(c) {
        return c.zoomhost || c.getZoomhost();
    },
    isHostAvailable(c) {
        return host_manager_1.isHostAvailable(c);
    },
    async meeting(c, _, ctx) {
        if (c.endDate < luxon_1.DateTime.local().minus({ week: 1 }).toJSDate() ||
            !c.zoomhostId ||
            !c.zoomId) {
            return null;
        }
        return zoom_api_1.getMeeting(c.zoomId, ctx.logger);
    },
    async recordings(c, _, ctx) {
        if (c.endDate < luxon_1.DateTime.local().minus({ weeks: 2 }).toJSDate() ||
            !c.zoomhostId ||
            !c.zoomId) {
            return [];
        }
        return zoom_api_1.getMeetingRecordings(c.zoomId, ctx.logger);
    },
    async numberOfRegistrations(c) {
        if (typeof c.numberOfRegistrations === 'number') {
            return c.numberOfRegistrations;
        }
        if (c.enrollments) {
            return c.enrollments.length;
        }
        return c.countEnrollments();
    },
    async numberOfAttendants(c) {
        if (c.enrollments) {
            return c.enrollments.filter(e => e.statusCode > 0).length;
        }
        const course = c.course || (await dataloader_1.catalogStore.getCourseById(c.courseId));
        if (course.isTrial && c.endDate < new Date()) {
            return c.countEnrollments({
                where: {
                    statusCode: {
                        [sequelize_1.Op.gt]: 0
                    }
                }
            });
        }
        return 0;
    },
    async notes(c) {
        return c.notes || c.getNotes();
    }
};
