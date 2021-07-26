"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const planner_1 = require("../inventory/planner");
const dataloader_1 = require("../lib/dataloader");
const search_user_1 = require("../lib/search-user");
const teacher_utils_1 = require("../lib/teacher-utils");
exports.default = {
    async class(_, args) {
        return cl_models_1.ClassModel.findByPk(args.id, {
            rejectOnEmpty: true,
            include: [
                cl_models_1.TeacherModel,
                cl_models_1.ZoomhostModel,
                cl_models_1.NoteModel,
                {
                    model: cl_models_1.EnrollmentModel,
                    include: [cl_models_1.StudentModel]
                },
                {
                    model: cl_models_1.TeacherModel,
                    as: 'observers'
                }
            ]
        });
    },
    course(_, args) {
        return dataloader_1.catalogStore.getCourseById(args.id);
    },
    subject(_, args) {
        return dataloader_1.catalogStore.getSubjectById(args.id);
    },
    subjects() {
        return dataloader_1.catalogStore.getSubjects();
    },
    // active class, not full and starts within 4 weeks
    async rescheduleCandidates(_, args) {
        const now = luxon_1.DateTime.local();
        const course = await dataloader_1.catalogStore.getCourseById(args.courseId);
        if (!course) {
            return [];
        }
        return cl_models_1.ClassModel.scope(['defaultScope', 'countStudent']).findAll({
            order: [['startDate', 'ASC']],
            where: {
                active: true,
                courseId: args.courseId,
                startDate: {
                    [sequelize_1.Op.gt]: now.minus({ week: 1 }).toJSDate()
                },
                endDate: {
                    [sequelize_1.Op.gt]: now.toJSDate()
                }
            },
            having: {
                numberOfRegistrations: {
                    [sequelize_1.Op.lt]: course.capacity
                }
            }
        });
    },
    async classes(_, args) {
        const classOpts = {};
        const courseOpts = {};
        if (args.teacherId) {
            classOpts.teacherId = args.teacherId;
        }
        else if (args.requireTeacher) {
            classOpts.teacherId = {
                [sequelize_1.Op.not]: null
            };
        }
        if (args.timeRange) {
            classOpts.startDate = { [sequelize_1.Op.lte]: args.timeRange.to };
            classOpts.endDate = { [sequelize_1.Op.gte]: args.timeRange.from };
        }
        if (args.active) {
            classOpts.active = true;
        }
        if (args.courseId) {
            courseOpts.id = args.courseId;
        }
        else if (args.subjectId) {
            courseOpts.subjectId = args.subjectId;
        }
        if (args.camp) {
            classOpts.days = {
                [sequelize_1.Op.between]: [4, cl_common_1.campClassMaxDays]
            };
            if (!classOpts.courseId) {
                courseOpts.level = {
                    [sequelize_1.Op.gt]: 0
                };
            }
        }
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const { count, rows } = await cl_models_1.ClassModel.findAndCountAll({
            where: classOpts,
            offset,
            limit,
            distinct: true,
            order: [['startDate', 'DESC']],
            include: [
                {
                    model: cl_models_1.EnrollmentModel,
                    required: args.requireStudents
                },
                {
                    model: cl_models_1.TeacherModel,
                    as: 'observers'
                },
                {
                    model: cl_models_1.CourseModel,
                    where: courseOpts,
                    required: true
                }
            ]
        });
        return {
            count,
            offset,
            limit,
            rows
        };
    },
    // session with students or already assigned a teacher
    async addonCandidates(_, args) {
        const sessions = await cl_models_1.SessionModel.findAll({
            order: [['startDate', 'ASC']],
            where: {
                startDate: {
                    [sequelize_1.Op.gt]: new Date()
                },
                idx: args.idx
            },
            include: [
                {
                    model: cl_models_1.StudentModel.unscoped(),
                    required: true,
                    attributes: ['id']
                },
                {
                    model: cl_models_1.ClassModel,
                    required: true,
                    where: {
                        active: true,
                        courseId: args.courseId
                    },
                    include: [cl_models_1.CourseModel, cl_models_1.TeacherModel]
                }
            ]
        });
        // allow full capacity + 1
        return sessions.filter(ses => ses.students.length <= ses.class.course.capacity);
    },
    async session(_, args) {
        return cl_models_1.SessionModel.findByPk(args.id, {
            rejectOnEmpty: true,
            order: [[cl_models_1.ClassModel, cl_models_1.SessionModel, 'idx', 'ASC']],
            include: [
                cl_models_1.AttendanceModel,
                {
                    model: cl_models_1.ClassModel,
                    include: [cl_models_1.TeacherModel]
                }
            ]
        });
    },
    async enrollment(_, args) {
        return cl_models_1.EnrollmentModel.findByPk(args.id, {
            rejectOnEmpty: true,
            order: [[cl_models_1.ClassModel, cl_models_1.SessionModel, 'idx', 'ASC']],
            include: [
                cl_models_1.ClassModel.scope(['defaultScope', 'countStudent']),
                cl_models_1.StudentModel,
                cl_models_1.TransactionModel,
                cl_models_1.PromotionModel
            ]
        });
    },
    async enrollments(_, args) {
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const classOpts = {};
        if (args.timeRange) {
            classOpts.startDate = { [sequelize_1.Op.lte]: args.timeRange.to };
            classOpts.endDate = { [sequelize_1.Op.gte]: args.timeRange.from };
        }
        const { count, rows } = await cl_models_1.EnrollmentModel.findAndCountAll({
            order: [
                ['id', 'DESC'],
                [cl_models_1.ClassModel, cl_models_1.SessionModel, 'idx', 'ASC']
            ],
            offset,
            limit,
            distinct: true,
            include: [
                cl_models_1.StudentModel,
                {
                    model: cl_models_1.ClassModel,
                    where: classOpts
                },
                {
                    model: cl_models_1.TransactionModel,
                    required: args.paidOnly
                }
            ]
        });
        return {
            count,
            offset,
            limit,
            rows
        };
    },
    async teacher(_, args, ctx) {
        ctx.ownerOrInternal(args.id);
        return cl_models_1.TeacherModel.findByPk(args.id, {
            rejectOnEmpty: true,
            include: [
                cl_models_1.CourseModel,
                cl_models_1.NoteModel,
                cl_models_1.TeacherCourseModel,
                {
                    model: cl_models_1.UserEmailTemplateModel,
                    as: 'emailTemplates'
                }
            ]
        });
    },
    async teachers(_, args, ctx) {
        ctx.internalOnly();
        const teachers = await dataloader_1.teacherStore.getAll();
        if (args.courseId) {
            return teachers.filter(t => t.courses.some(c => c.id === args.courseId));
        }
        return teachers;
    },
    async commonEmailTemplates(_, args) {
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const { rows, count } = await cl_models_1.UserEmailTemplateModel.findAndCountAll({
            order: [['updatedAt', 'DESC']],
            offset,
            limit,
            where: { isCommon: true }
        });
        return {
            offset,
            limit,
            count,
            rows
        };
    },
    async teacherEmailTemplates(_, args) {
        const commonFilter = {
            isCommon: true
        };
        if (args.subjectId) {
            commonFilter.subjectId = args.subjectId;
        }
        else if (args.courseId) {
            const course = await dataloader_1.catalogStore.getCourseById(args.courseId);
            commonFilter.subjectId = course.subjectId;
        }
        return cl_models_1.UserEmailTemplateModel.findAll({
            where: {
                [sequelize_1.Op.or]: [{ teacherId: args.teacherId }, commonFilter]
            }
        });
    },
    async user(_, args, ctx) {
        ctx.ownerOrInternal(args.id);
        return cl_models_1.UserModel.findByPk(args.id, {
            order: [[cl_models_1.CreditModel, 'createdAt', 'DESC']],
            rejectOnEmpty: true,
            include: [
                cl_models_1.CreditModel,
                {
                    model: cl_models_1.StudentModel,
                    as: 'children',
                    include: [cl_models_1.NoteModel]
                }
            ]
        });
    },
    async credits(root, args, ctx) {
        ctx.internalOnly();
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const { rows, count } = await cl_models_1.CreditModel.findAndCountAll({
            order: [['createdAt', 'DESC']],
            include: [cl_models_1.UserModel],
            offset,
            limit,
            where: {
                type: {
                    [sequelize_1.Op.not]: cl_common_1.CreditType.Purchase
                }
            }
        });
        return {
            offset,
            limit,
            count,
            rows
        };
    },
    async promotion(_, args) {
        if ('id' in args) {
            return cl_models_1.PromotionModel.findByPk(args.id, {
                rejectOnEmpty: true
            });
        }
        return cl_models_1.PromotionModel.findOne({
            where: {
                code: args.code
            }
        });
    },
    async promotions(_, args, ctx) {
        ctx.internalOnly();
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const { rows, count } = await cl_models_1.PromotionModel.findAndCountAll({
            where: {
                userId: { [sequelize_1.Op.is]: null }
            },
            order: [['updatedAt', 'DESC']],
            offset,
            limit
        });
        return {
            offset,
            limit,
            count,
            rows
        };
    },
    async blogPost(_, args) {
        return cl_models_1.BlogPostModel.findByPk(args.id, {
            rejectOnEmpty: true
        });
    },
    async blogPosts(_, args, ctx) {
        ctx.internalOnly();
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const { rows, count } = await cl_models_1.BlogPostModel.findAndCountAll({
            order: [['createdAt', 'DESC']],
            offset,
            limit
        });
        return {
            offset,
            limit,
            count,
            rows
        };
    },
    async users(_, args, ctx) {
        ctx.adminOnly();
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const condition = {
            order: [['createdAt', 'DESC']],
            offset,
            limit
        };
        if (args.referralOnly) {
            condition.where = {
                refererId: {
                    [sequelize_1.Op.not]: null
                }
            };
        }
        const { rows, count } = await cl_models_1.UserModel.scope('children').findAndCountAll(condition);
        return {
            offset,
            limit,
            count,
            rows
        };
    },
    async projects(_, args) {
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const { rows, count } = await cl_models_1.ProjectModel.findAndCountAll({
            order: [['createdAt', 'DESC']],
            include: [cl_models_1.StudentModel, cl_models_1.SubjectModel],
            offset,
            limit,
            where: {
                published: true,
                ...lodash_1.pick(args, 'studentId', 'subjectId')
            }
        });
        return {
            offset,
            limit,
            count,
            rows
        };
    },
    async articles(_, args) {
        const offset = args.offset || 0;
        const limit = args.limit || 25;
        const { rows, count } = await cl_models_1.ArticleModel.findAndCountAll({
            order: [['createdAt', 'DESC']],
            offset,
            limit,
            where: {
                published: {
                    [sequelize_1.Op.not]: false
                }
            }
        });
        return {
            offset,
            limit,
            count,
            rows
        };
    },
    partner(_, args) {
        return cl_models_1.PartnerModel.findByPk(args.id, {
            include: [cl_models_1.CourseModel]
        });
    },
    partners() {
        return cl_models_1.PartnerModel.findAll({
            order: [['updatedAt', 'DESC']],
            include: [cl_models_1.CourseModel]
        });
    },
    async userSearch(_, args, ctx) {
        ctx.internalOnly();
        return search_user_1.searchUser(args.search);
    },
    async scheduleProposals(_, args, ctx) {
        const course = await dataloader_1.catalogStore.getCourseById(args.courseId);
        if (!course || course.level < 0) {
            return null;
        }
        const fLogger = ctx.logger.child({
            query: 'ScheduleProposals',
            courseId: args.courseId
        });
        const start = args.from ? luxon_1.DateTime.fromJSDate(args.from) : luxon_1.DateTime.local();
        const range = course.isRegular ? 12 : 6;
        const candidates = planner_1.proposeSchedules(course, start, range);
        if (candidates.length === 0) {
            return null;
        }
        const result = [];
        fLogger.info('%d candidates found for the next %d days', candidates.length, range);
        let latest = start.plus({ days: range }).toJSDate();
        for (const klass of candidates) {
            if (klass.endDate > latest) {
                latest = klass.endDate;
            }
        }
        const potentialTeachers = await teacher_utils_1.getPotentialTeachers(start.toJSDate(), latest, course.id);
        const ocs = potentialTeachers.map(t => new teacher_utils_1.Occupancy(t));
        for (const klass of candidates) {
            const availables = ocs.filter(oc => oc.available(klass));
            if (availables.length > 0) {
                fLogger.info('%d teachers available at %s', availables.length, luxon_1.DateTime.fromJSDate(klass.startDate, cl_common_1.tzOpts).toFormat('f'));
                result.push({
                    id: klass.id,
                    schedules: klass.schedules,
                    courseId: klass.courseId,
                    teachers: availables.map(a => a.teacher)
                });
            }
        }
        return result;
    }
};
