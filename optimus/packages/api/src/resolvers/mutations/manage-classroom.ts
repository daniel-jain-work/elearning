import { Graphql } from '@cl/types';
import { CommentModel, TeacherModel, ThreadModel } from 'cl-models';
import { nanoid } from 'nanoid';
import { filterXSS } from 'xss';
import { GraphqlContext } from '../../graphql-handler';
import { uploadClassroomFile } from '../../lib/s3-utils';

export async function addThread(
  root: any,
  args: Graphql.AddThreadArgs,
  ctx: GraphqlContext
) {
  ctx.ownerOrAdmin(args.teacherId);

  const details: ThreadModel['details'] = {
    content: filterXSS(args.content),
    attachments: []
  };

  if (args.attachments) {
    const uploads = await Promise.all(
      args.attachments.map(attachment =>
        uploadClassroomFile(
          args.classId + '/' + attachment.name + nanoid(4),
          attachment.content
        )
      )
    );

    details.attachments = uploads.map(result => result.resultURL);
  }

  const thread = await ThreadModel.create({
    classId: args.classId,
    teacherId: args.teacherId,
    details
  });

  thread.teacher = await TeacherModel.findByPk(ctx.teacherId);

  ctx.logger.info(
    { classId: thread.classId, threadId: thread.id, teacherId: thread.teacherId },
    'started a thread'
  );

  return thread;
}

export async function deleteThread(
  root: any,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  const thread = await ThreadModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  ctx.ownerOrInternal(thread.teacherId);

  ctx.logger.info(
    { classId: thread.classId, threadId: thread.id, teacherId: thread.teacherId },
    'deleted a thread'
  );

  await thread.destroy();

  return true;
}

export async function addComment(
  root: any,
  args: Graphql.AddCommentArgs,
  ctx: GraphqlContext
) {
  ctx.ownerOrAdmin(args.teacherId);

  const comment = await CommentModel.create(args);
  comment.teacher = await TeacherModel.findByPk(ctx.teacherId);

  ctx.logger.info(
    { threadId: comment.threadId, teacherId: comment.teacherId },
    'added a comment'
  );

  return comment;
}

export async function deleteComment(
  root: any,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  const comment = await CommentModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  ctx.ownerOrInternal(comment.teacherId);
  ctx.logger.info(
    { threadId: comment.threadId, teacherId: comment.teacherId },
    'deleted a comment'
  );

  await comment.destroy();

  return true;
}
