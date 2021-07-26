import { Graphql } from '@cl/types';
import { StudentModel } from 'cl-models';
import { GraphqlContext } from '../../graphql-handler';

export async function editStudentProfile(
  root: any,
  args: Graphql.EditStudentProfileArgs,
  ctx: GraphqlContext
) {
  const student = await StudentModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  if (args.name) {
    student.set('name', args.name);
  }

  if (args.gender) {
    student.set('gender', args.gender);
  }

  if (args.year > 0) {
    student.set('year', args.year);
  }

  if (args.school) {
    student.set('details', {
      ...student.details,
      school: args.school
    });
  }

  await student.save();

  ctx.logger.info(
    { userId: student.parentId },
    'student %s profile updated',
    student.name
  );

  return student;
}
