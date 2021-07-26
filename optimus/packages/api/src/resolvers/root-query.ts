import { Graphql } from '@cl/types';
import { campClassMaxDays, CreditType, tzOpts } from 'cl-common';
import {
  ArticleModel,
  AttendanceModel,
  BlogPostModel,
  ClassModel,
  CourseModel,
  CreditModel,
  EnrollmentModel,
  NoteModel,
  OfflineModel,
  PartnerModel,
  ProjectModel,
  PromotionModel,
  SessionModel,
  StudentModel,
  SubjectModel,
  TeacherCourseModel,
  TeacherModel,
  TimeoffModel,
  TransactionModel,
  UserEmailTemplateModel,
  UserModel,
  ZoomhostModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { FindOptions, Op, WhereOptions } from 'sequelize';
import { GraphqlContext } from '../graphql-handler';
import { proposeSchedules } from '../inventory/planner';
import { catalogStore, teacherStore } from '../lib/dataloader';
import { searchUser } from '../lib/search-user';
import { getTeacherOccupancies } from '../lib/teacher-utils';

export default {
  async class(_, args: Graphql.IdArgs) {
    return ClassModel.scope(['defaultScope', 'countStudent']).findByPk(args.id, {
      rejectOnEmpty: true,
      order: [
        [SessionModel, 'idx', 'ASC'],
        [NoteModel, 'createdAt', 'DESC']
      ],
      include: [
        TeacherModel,
        ZoomhostModel,
        NoteModel,
        {
          model: TeacherModel,
          as: 'observers'
        },
        {
          model: OfflineModel,
          include: [TransactionModel]
        }
      ]
    });
  },

  course(_, args: Graphql.IdArgs) {
    return catalogStore.getCourseById(args.id);
  },

  subject(_, args: Graphql.IdArgs) {
    return catalogStore.getSubjectById(args.id);
  },

  subjects(_, args: Graphql.SubjectsQuery) {
    return catalogStore.getSubjects(args.officialOnly);
  },

  // active class, not full and starts within 4 weeks
  async rescheduleCandidates(_, args: Graphql.CourseIdArgs) {
    const now = DateTime.local();
    const course = await catalogStore.getCourseById(args.courseId);
    if (!course) {
      return [];
    }

    return ClassModel.scope(['defaultScope', 'countStudent']).findAll({
      order: [['startDate', 'ASC']],
      where: {
        active: true,
        courseId: args.courseId,
        startDate: {
          [Op.gt]: now.minus({ week: 1 }).toJSDate()
        },
        endDate: {
          [Op.gt]: now.toJSDate()
        }
      },
      having: {
        numberOfRegistrations: {
          [Op.lt]: course.capacity
        }
      }
    });
  },

  async classes(_, args: Graphql.ClassesQuery) {
    const classOpts: WhereOptions = {};
    const courseOpts: WhereOptions = {};

    if (args.teacherId) {
      classOpts.teacherId = args.teacherId;
    } else if (args.requireTeacher) {
      classOpts.teacherId = {
        [Op.not]: null
      };
    }

    if (args.timeRange) {
      classOpts.startDate = { [Op.lte]: args.timeRange.to };
      classOpts.endDate = { [Op.gte]: args.timeRange.from };
    }

    if (args.active) {
      classOpts.active = true;
    }

    if (args.courseId) {
      courseOpts.id = args.courseId;
    } else if (args.subjectId) {
      courseOpts.subjectId = args.subjectId;
    }

    if (args.camp) {
      classOpts.days = {
        [Op.lt]: campClassMaxDays
      };
      courseOpts.official = true;
      courseOpts.level = {
        [Op.gt]: 0
      };
    }

    const offset = args.offset || 0;
    const limit = args.limit || 25;
    const { count, rows } = await ClassModel.findAndCountAll({
      where: classOpts,
      offset,
      limit,
      order: [['startDate', 'DESC']],
      include: [
        {
          model: EnrollmentModel,
          required: args.requireStudents
        },
        {
          model: TeacherModel,
          as: 'observers'
        },
        {
          model: CourseModel,
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
  async addonCandidates(_, args: Graphql.AddonCandidatesArgs) {
    const sessions = await SessionModel.findAll({
      order: [['startDate', 'ASC']],
      where: {
        startDate: {
          [Op.gt]: new Date()
        },
        idx: args.idx
      },
      include: [
        {
          model: StudentModel.unscoped(),
          required: true,
          attributes: ['id']
        },
        {
          model: ClassModel,
          required: true,
          where: {
            active: true,
            courseId: args.courseId
          },
          include: [CourseModel, TeacherModel]
        }
      ]
    });

    // allow full capacity + 1
    return sessions.filter(ses => ses.students.length <= ses.class.course.capacity);
  },

  async session(_, args: Graphql.IdArgs) {
    return SessionModel.findByPk(args.id, {
      rejectOnEmpty: true,
      order: [[ClassModel, SessionModel, 'idx', 'ASC']],
      include: [
        AttendanceModel,
        {
          model: ClassModel,
          include: [TeacherModel]
        }
      ]
    });
  },

  async enrollment(_, args: Graphql.IdArgs) {
    return EnrollmentModel.findByPk(args.id, {
      rejectOnEmpty: true,
      order: [[ClassModel, SessionModel, 'idx', 'ASC']],
      include: [
        ClassModel.scope(['defaultScope', 'countStudent']),
        StudentModel,
        TransactionModel,
        PromotionModel
      ]
    });
  },

  async enrollments(_, args: Graphql.EnrollmentsQueryArgs) {
    const offset = args.offset || 0;
    const limit = args.limit || 25;
    const classOpts: WhereOptions = {};

    if (args.timeRange) {
      classOpts.startDate = { [Op.lte]: args.timeRange.to };
      classOpts.endDate = { [Op.gte]: args.timeRange.from };
    }

    const { count, rows } = await EnrollmentModel.findAndCountAll({
      order: [
        ['id', 'DESC'],
        [ClassModel, SessionModel, 'idx', 'ASC']
      ],
      offset,
      limit,
      distinct: true,
      include: [
        StudentModel,
        {
          model: ClassModel,
          where: classOpts
        },
        {
          model: TransactionModel,
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

  async teacher(_, args: Graphql.IdArgs, ctx: GraphqlContext) {
    ctx.ownerOrInternal(args.id);
    return TeacherModel.findByPk(args.id, {
      rejectOnEmpty: true,
      order: [
        [NoteModel, 'createdAt', 'DESC'],
        [TimeoffModel, 'end', 'DESC']
      ],
      include: [CourseModel, NoteModel, TeacherCourseModel, TimeoffModel]
    });
  },

  async teachers(_, args: Partial<Graphql.CourseIdArgs>, ctx: GraphqlContext) {
    ctx.internalOnly();

    const teachers = await teacherStore.getAll();
    if (args.courseId) {
      return teachers.filter(t => t.courses.some(c => c.id === args.courseId));
    }

    return teachers;
  },

  async commonEmailTemplates(_, args: Graphql.ListEmailTemplatesArgs) {
    const offset = args.offset || 0;
    const limit = args.limit || 25;
    const subjectFilter: WhereOptions = {
      isCommon: true
    };

    if (args.subjectId) {
      subjectFilter.subjectId = args.subjectId;
    }
    const { rows, count } = await UserEmailTemplateModel.findAndCountAll({
      order: [['updatedAt', 'DESC']],
      offset,
      limit,
      where: subjectFilter
    });

    return {
      offset,
      limit,
      count,
      rows
    };
  },

  async teacherEmailTemplates(_, args: Graphql.TeacherEmailTemplatesArgs) {
    const commonFilter: WhereOptions = {
      isCommon: true
    };

    if (args.subjectId) {
      commonFilter.subjectId = args.subjectId;
    }

    return UserEmailTemplateModel.findAll({
      where: {
        isClassroom: false,
        [Op.or]: [{ teacherId: args.teacherId }, commonFilter]
      }
    });
  },

  async user(_, args: Graphql.IdArgs, ctx: GraphqlContext) {
    ctx.ownerOrInternal(args.id);
    return UserModel.findByPk(args.id, {
      order: [
        [CreditModel, 'createdAt', 'DESC'],
        ['children', NoteModel, 'createdAt', 'DESC']
      ],
      rejectOnEmpty: true,
      include: [
        CreditModel,
        {
          model: StudentModel,
          as: 'children',
          include: [NoteModel]
        }
      ]
    });
  },

  async credits(root, args: Graphql.ListCreditArgs, ctx: GraphqlContext) {
    ctx.internalOnly();

    const offset = args.offset || 0;
    const limit = args.limit || 25;

    const { rows, count } = await CreditModel.findAndCountAll({
      order: [['createdAt', 'DESC']],
      include: [UserModel],
      offset,
      limit,
      where: {
        type: {
          [Op.not]: CreditType.Purchase
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

  async promotion(_, args: Graphql.PromotionQueryArgs) {
    if ('id' in args) {
      return PromotionModel.findByPk(args.id, {
        rejectOnEmpty: true
      });
    }

    return PromotionModel.findOne({
      where: {
        code: args.code
      }
    });
  },

  async promotions(_, args: Graphql.ListPromotionsArgs, ctx: GraphqlContext) {
    ctx.internalOnly();

    const offset = args.offset || 0;
    const limit = args.limit || 25;
    const { rows, count } = await PromotionModel.findAndCountAll({
      where: {
        userId: { [Op.is]: null }
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

  async blogPost(_, args: Graphql.IdArgs) {
    return BlogPostModel.findByPk(args.id, {
      rejectOnEmpty: true
    });
  },

  async blogPosts(_, args: Graphql.ListBlogPostsArgs, ctx: GraphqlContext) {
    ctx.internalOnly();

    const offset = args.offset || 0;
    const limit = args.limit || 25;
    const { rows, count } = await BlogPostModel.findAndCountAll({
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

  async users(_, args: Graphql.ListUsersArgs, ctx: GraphqlContext) {
    ctx.adminOnly();

    const offset = args.offset || 0;
    const limit = args.limit || 25;
    const condition: FindOptions = {
      order: [['createdAt', 'DESC']],
      offset,
      limit
    };
    if (args.referralOnly) {
      condition.where = {
        refererId: {
          [Op.not]: null
        }
      };
    }

    const { rows, count } = await UserModel.scope('children').findAndCountAll(
      condition
    );

    return {
      offset,
      limit,
      count,
      rows
    };
  },

  async projects(_, args: Graphql.ListProjectsVars, ctx: GraphqlContext) {
    const cond: WhereOptions = {
      published: true
    };

    if (args.studentId) {
      cond.studentId = args.studentId;
    }

    if (args.subjectId) {
      cond.subjectId = args.subjectId;
    } else if (!ctx.isAdmin && ctx.teacherId) {
      const t = await TeacherModel.findByPk(ctx.teacherId, {
        include: [CourseModel]
      });

      const subjectIds = new Set(t.courses.map(c => c.subjectId));
      if (subjectIds.size > 0) {
        cond.subjectId = {
          [Op.or]: [
            {
              [Op.in]: [...subjectIds]
            },
            {
              [Op.is]: null
            }
          ]
        };
      } else {
        cond.subjectId = { [Op.is]: null };
      }
    }

    const offset = args.offset || 0;
    const limit = args.limit || 25;

    const { rows, count } = await ProjectModel.findAndCountAll({
      order: [['createdAt', 'DESC']],
      include: [StudentModel, SubjectModel],
      offset,
      limit,
      where: cond
    });

    return {
      offset,
      limit,
      count,
      rows
    };
  },

  async articles(_, args: Graphql.ListArticlesArgs) {
    const offset = args.offset || 0;
    const limit = args.limit || 25;

    const { rows, count } = await ArticleModel.findAndCountAll({
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      where: {
        published: {
          [Op.not]: false
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

  partner(_, args: Graphql.IdArgs) {
    return PartnerModel.findByPk(args.id, {
      include: [CourseModel]
    });
  },
  partners() {
    return PartnerModel.findAll({
      order: [['updatedAt', 'DESC']],
      include: [CourseModel]
    });
  },

  async userSearch(_, args: Graphql.UserSearchQueryArgs, ctx: GraphqlContext) {
    ctx.internalOnly();
    return searchUser(args.search);
  },

  async scheduleProposals(
    _,
    args: Graphql.ScheduleProposalsQuery,
    ctx: GraphqlContext
  ) {
    const course = await catalogStore.getCourseById(args.courseId);
    if (!course || course.level < 0) {
      return null;
    }

    const fLogger = ctx.logger.child({
      query: 'ScheduleProposals',
      courseId: args.courseId
    });

    const start = args.from ? DateTime.fromJSDate(args.from) : DateTime.local();
    const range = course.isRegular ? 12 : 6;

    const candidates = proposeSchedules(course, start, range);

    if (candidates.length === 0) {
      return null;
    }

    const result: {
      id: ClassModel['id'];
      schedules: ClassModel['schedules'];
      courseId: ClassModel['courseId'];
      teachers: TeacherModel[];
    }[] = [];

    fLogger.info(
      '%d candidates found for the next %d days',
      candidates.length,
      range
    );

    let latest = start.plus({ days: range }).toJSDate();
    for (const klass of candidates) {
      if (klass.endDate > latest) {
        latest = klass.endDate;
      }
    }

    const occupancies = await getTeacherOccupancies(
      start.toJSDate(),
      latest,
      course.id
    );

    for (const klass of candidates) {
      const availables = occupancies.filter(oc => oc.available(klass)).slice(0, 6);

      if (availables.length > 0) {
        fLogger.info(
          '%d teachers available at %s',
          availables.length,
          DateTime.fromJSDate(klass.startDate, tzOpts).toFormat('f')
        );

        result.push({
          id: klass.id,
          schedules: klass.schedules,
          courseId: klass.courseId,
          teachers: availables.map(a => a.teacher)
        });
      }
    }

    return result;
  },

  async zoomhost(_, args: Graphql.IdArgs) {
    return ZoomhostModel.findByPk(args.id, {
      rejectOnEmpty: true
    });
  },

  zoomhosts() {
    return ZoomhostModel.findAll({
      order: [['updatedAt', 'DESC']]
    });
  }
};
