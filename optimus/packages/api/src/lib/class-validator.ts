import { ClassModel, CourseModel, TeacherCourseModel } from 'cl-models';
import { GraphqlContext } from '../graphql-handler';
import { Topic } from 'cl-common';
import { Graphql } from '@cl/types';
import { catalogStore } from './dataloader';

export function assertSchedulesValid(
  schedules: [Date, Date][],
  ctx: GraphqlContext
) {
  let error = '';
  for (let idx = 0; idx < schedules.length; idx++) {
    const [start, end] = schedules[idx];

    if (!start || !end || start >= end) {
      error = `Session ${idx + 1} has invalid time`;
      break;
    }

    if (schedules[idx + 1]) {
      const nextStart = schedules[idx + 1][0];
      if (end > nextStart) {
        error = `Session ${idx + 1} ends later than next session`;
      }
    }
  }

  if (error) {
    ctx.badRequest(error, {
      schedules
    });
  }
}

export async function isClassEditable(klass: ClassModel, ctx: GraphqlContext) {
  if (ctx.isInternal) {
    return true;
  }

  if (klass.teacherId && klass.teacherId === ctx.teacherId) {
    const course =
      klass.course || (await catalogStore.getCourseById(klass.courseId));
    return course.subjectId === Topic.PARTNERS;
  }

  return false;
}

export async function assertCanCreateClass(
  args: Graphql.CreateClassVars,
  ctx: GraphqlContext
) {
  if (ctx.isInternal) {
    return;
  }

  // create platform class assigning to youself
  if (args.teacherId && args.teacherId === ctx.teacherId) {
    const course = await catalogStore.getCourseById(args.courseId);
    if (course.subjectId === Topic.PARTNERS) {
      if (
        await TeacherCourseModel.findOne({
          where: {
            teacherId: args.teacherId,
            courseId: args.courseId
          }
        })
      ) {
        return;
      }
    }
  }

  ctx.unauthorized(`Not allowed to create ${args.courseId}`);
}

export async function assertCanEditClass(klass: ClassModel, ctx: GraphqlContext) {
  const editable = await isClassEditable(klass, ctx);
  if (!editable) {
    ctx.unauthorized(`Not allowed to edit ${klass.courseId}`);
  }
}
