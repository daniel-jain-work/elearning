import { Graphql, TimeRange } from '@cl/types';
import {
  ClassModel,
  CourseModel,
  StudentModel,
  TeacherCourseModel,
  TeacherModel
} from 'cl-models';
import { Op, WhereOptions } from 'sequelize';
import { GraphqlContext } from '../graphql-handler';
import { catalogStore } from '../lib/dataloader';

export const getClassTimeFilter = (args: TimeRange) => {
  const filter: WhereOptions = {};

  if (args.from) {
    filter.endDate = {
      [Op.gt]: args.from
    };
  }

  if (args.to) {
    filter.startDate = {
      [Op.lt]: args.to
    };
  }

  return filter;
};

interface Capability extends Graphql.IdArgs, Graphql.CourseIdArgs {
  priority: number;
  course: CourseModel;
}

export default {
  async courses(t: TeacherModel) {
    return t.courses || t.getCourses();
  },

  async timeoffs(t: TeacherModel) {
    return t.timeoffs || t.getTimeoffs();
  },

  async capabilities(t: TeacherModel) {
    const tcs =
      t.teacherCourses ||
      (await TeacherCourseModel.findAll({
        where: { teacherId: t.id }
      }));

    const capabilities: Capability[] = [];
    for (const tc of tcs) {
      capabilities.push({
        id: tc.teacherId + tc.courseId,
        courseId: tc.courseId,
        priority: tc.priority,
        course: await catalogStore.getCourseById(tc.courseId)
      });
    }

    return capabilities;
  },

  async emailTemplates(t: TeacherModel) {
    return t.emailTemplates || t.getEmailTemplates();
  },

  async notes(t: TeacherModel, args: any, ctx: GraphqlContext) {
    if (!ctx.isInternal) {
      return [];
    }

    return t.notes || t.getNotes();
  },

  async sessions(t: TeacherModel, args: TimeRange) {
    return t.getAssignments({
      order: [['startDate', 'ASC']],
      where: getClassTimeFilter(args),
      include: [StudentModel.unscoped(), ClassModel]
    });
  }
};
