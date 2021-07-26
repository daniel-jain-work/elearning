import { Graphql } from '@cl/types';
import { BlogPostModel } from 'cl-models';
import { pick } from 'lodash';
import { GraphqlContext } from '../../graphql-handler';
import { emitBlogUpdatedEvent } from '../../lib/cloudwatch';

function prepareData(
  args: Graphql.UpdateBlogPostArgs | Graphql.CreateBlogPostArgs,
  adminUser: string
) {
  return {
    slug: args.slug,
    published: args.published,
    details: {
      ...pick(args, 'tags', 'title', 'content', 'featured', 'thumbnail'),
      createdBy: adminUser
    }
  };
}

export async function updateBlogPost(
  root: any,
  args: Graphql.UpdateBlogPostArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const blogPost = await BlogPostModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  await blogPost.update(prepareData(args, ctx.identity));

  ctx.logger.info({ blogPostId: blogPost.id }, 'blog updated');

  await emitBlogUpdatedEvent({
    blogPostId: blogPost.id,
    identity: ctx.identity
  });

  return blogPost;
}

export async function createBlogPost(
  root: any,
  args: Graphql.CreateBlogPostArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const blogPost = new BlogPostModel(prepareData(args, ctx.identity));

  await blogPost.save();

  ctx.logger.info({ blogPostId: blogPost.id }, 'blog created');

  if (blogPost.published) {
    await emitBlogUpdatedEvent({
      blogPostId: blogPost.id,
      identity: ctx.identity
    });
  }

  return blogPost;
}
