import { Graphql } from '@cl/types';
import { CourseModel, SubjectModel } from 'cl-models';
import { GraphqlContext } from '../../graphql-handler';
import { catalogStore } from '../../lib/dataloader';

export async function createCourse(
  _,
  args: Graphql.CreateCourseArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  let subject = await catalogStore.getSubjectById(args.subjectId);
  const course = new CourseModel({
    id: args.id,
    subjectId: args.subjectId,
    official: subject.official
  });

  await updateCourseAttributes(course, args, ctx);
  ctx.logger.info({ args }, 'course created');

  subject = await syncGradesChanges(course);
  catalogStore.updateCache(subject);

  return course;
}

export async function updateCourse(
  _,
  args: Graphql.UpdateCourseArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const course = await CourseModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  await updateCourseAttributes(course, args, ctx);
  ctx.logger.info('course updated');
  const subject = await syncGradesChanges(course);
  catalogStore.updateCache(subject);

  return course;
}

export async function updateSubject(
  _,
  args: Graphql.UpdateSubjectArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const subject = await SubjectModel.findByPk(args.id, {
    rejectOnEmpty: true,
    order: [[CourseModel, 'level', 'ASC']],
    include: [CourseModel]
  });

  const { name, ...details } = args;
  await subject.update({
    name: name || subject.name,
    details: { ...subject.details, ...details }
  });

  ctx.logger.info({ args }, 'subject updated');
  catalogStore.updateCache(subject);

  return subject;
}

async function syncGradesChanges(course: CourseModel) {
  const subject = await SubjectModel.findByPk(course.subjectId, {
    order: [[CourseModel, 'level', 'ASC']],
    include: [CourseModel]
  });

  if (subject.courses.length > 0) {
    let min = subject.courses[0].min;
    let max = subject.courses[0].max;

    for (const c of subject.courses) {
      if (c.min > 0) {
        min = Math.min(min, c.min);
      }
      if (c.max > 0) {
        max = Math.max(max, c.max);
      }
    }

    await subject.update({
      min,
      max
    });
  }

  return subject;
}

async function updateCourseAttributes(
  course: CourseModel,
  attrs: Omit<Graphql.UpdateCourseArgs, 'id'>,
  ctx: GraphqlContext
) {
  const { name, level, grades, ...details } = attrs;

  if (grades) {
    if (grades[0] > 0 && grades[1] > grades[0]) {
      course.set('min', grades[0]);
      course.set('max', grades[1]);
    } else {
      ctx.badRequest('not valid grades', {
        grades
      });
    }
  }

  if (name) {
    course.set('name', name);
  }

  if (typeof level === 'number') {
    course.set('level', level);
  }

  course.set('details', {
    ...course.details,
    ...details
  });

  await course.save();

  ctx.logger.info(
    { payload: attrs, courseId: course.id },
    'course %s is updated ',
    course.name
  );
}
