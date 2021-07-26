import { Graphql } from '@cl/types';
import { ClassModel, NoteModel, StudentModel, TeacherModel } from 'cl-models';
import { Transaction } from 'sequelize';
import { GraphqlContext } from '../../graphql-handler';

export const createNote = (
  args:
    | Graphql.AddNoteToClassArgs
    | Graphql.AddNoteToStudentArgs
    | Graphql.AddNoteToTeacherArgs,
  ctx: GraphqlContext,
  transaction?: Transaction
) =>
  NoteModel.create(
    {
      author: ctx.identity,
      ...args
    },
    transaction && { transaction }
  );

export async function addNoteToStudent(
  _,
  args: Graphql.AddNoteToStudentArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  await createNote(args, ctx);
  return StudentModel.findByPk(args.studentId, {
    include: [NoteModel]
  });
}

export async function addNoteToClass(
  _,
  args: Graphql.AddNoteToClassArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  await createNote(args, ctx);
  return ClassModel.findByPk(args.classId, {
    include: [NoteModel]
  });
}

export async function addNoteToTeacher(
  _,
  args: Graphql.AddNoteToTeacherArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  await createNote(args, ctx);
  return TeacherModel.findByPk(args.teacherId, {
    include: [NoteModel]
  });
}

export async function removeNote(_, args: Graphql.IdArgs, ctx: GraphqlContext) {
  ctx.internalOnly();

  const result = await NoteModel.destroy({
    where: {
      id: args.id
    }
  });

  return result > 0;
}
