import { Graphql, TimeRange } from '@cl/types';
import {
  ClassModel,
  CourseModel,
  CreditModel,
  PromotionModel,
  StudentModel,
  TeacherModel,
  TransactionModel
} from 'cl-models';
import { GraphqlContext } from '../graphql-handler';
import { getNextCourse, getRecommendation } from '../lib/recommendations';
import { getClassTimeFilter } from './teacher-query';

export default {
  async classes(s: StudentModel, args: TimeRange & { official: boolean }) {
    return s.getClasses({
      where: getClassTimeFilter(args),
      include: [
        TeacherModel,
        args.official
          ? {
              model: CourseModel,
              where: {
                official: true
              }
            }
          : CourseModel
      ]
    });
  },

  async addons(s: StudentModel) {
    return (
      s.addons ||
      s.getAddons({
        include: [
          {
            model: ClassModel,
            include: [TeacherModel]
          }
        ]
      })
    );
  },

  async notes(s: StudentModel, args: any, ctx: GraphqlContext) {
    if (!ctx.isInternal) {
      return [];
    }

    return s.notes || s.getNotes();
  },

  async enrollments(s: StudentModel) {
    return (
      s.enrollments ||
      s.getEnrollments({
        include: [
          CreditModel,
          PromotionModel,
          TransactionModel,
          {
            model: ClassModel,
            include: [TeacherModel]
          }
        ]
      })
    );
  },

  async nextup(s: StudentModel, args: Partial<Graphql.ClassIdArgs>) {
    let registration: ClassModel;
    let recommendation: CourseModel;

    const history = await s.getClasses({
      order: [['startDate', 'ASC']]
    });

    let current = new Date();

    if (args.classId) {
      const klass = await ClassModel.findByPk(args.classId, {
        rejectOnEmpty: true
      });

      current = klass.startDate;
      recommendation = await getNextCourse(klass);
      if (recommendation) {
        registration = history.find(c => c.courseId === recommendation.id);
      }
    }

    if (!recommendation) {
      recommendation = await getRecommendation(s.age, history);
    }

    if (!registration) {
      registration = history.find(c => c.startDate > current);
    }

    return {
      recommendation,
      registration
    };
  }
};
