import { Graphql } from '@cl/types';
import { UserEmailTemplateModel } from 'cl-models';
import { filterXSS } from 'xss';
import { GraphqlContext } from '../../graphql-handler';

export async function removeEmailTemplate(
  root: any,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  const emailTemplate = await UserEmailTemplateModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  if (emailTemplate.teacherId) {
    ctx.ownerOrAdmin(emailTemplate.teacherId);
  } else {
    ctx.adminOnly();
  }

  await emailTemplate.destroy();

  return true;
}

export async function updateEmailTemplate(
  root: any,
  args: Graphql.UpdateEmailTemplateArgs,
  ctx: GraphqlContext
) {
  if ('teacherId' in args) {
    ctx.ownerOrAdmin(args.teacherId);
  } else {
    ctx.internalOnly();
  }

  let tpl: UserEmailTemplateModel;

  if (args.id) {
    tpl = await UserEmailTemplateModel.findByPk(args.id);
  } else {
    tpl = new UserEmailTemplateModel();
  }

  tpl.set('name', args.name);
  tpl.set('details', {
    html: filterXSS(args.html),
    subject: args.subject
  });

  if (args.teacherId) tpl.set('teacherId', args.teacherId);
  if (args.subjectId) tpl.set('subjectId', args.subjectId);
  if (args.isCommon) tpl.set('isCommon', args.isCommon);

  return tpl.save();
}
