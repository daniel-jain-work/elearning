import { Graphql } from '@cl/types';
import { ProjectModel } from 'cl-models';
import { GraphqlContext } from '../../graphql-handler';

export async function updateProject(
  root: any,
  args: Graphql.UpdateProjectArgs,
  ctx: GraphqlContext
) {
  ctx.adminOnly();

  const project = await ProjectModel.findByPk(args.id, {
    rejectOnEmpty: true
  });
  setProjectAttributes(project, args);
  await project.save();

  ctx.logger.info('project %s is updated', project.title);

  return project;
}

function setProjectAttributes(
  project: ProjectModel,
  attrs: Omit<Graphql.UpdateProjectArgs, 'id'>
) {
  const { published, featured, subjectId, ...details } = attrs;
  if (typeof published === 'boolean') {
    project.set('published', published);
  }
  if (featured >= 0) {
    project.set('featured', featured);
  }
  if (subjectId) {
    project.set('subjectId', subjectId);
  }
  project.set('details', {
    ...project.details,
    ...details
  });
}
