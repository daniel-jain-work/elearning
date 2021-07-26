"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBlogPost = exports.updateBlogPost = void 0;
const cl_models_1 = require("cl-models");
const lodash_1 = require("lodash");
const cloudwatch_1 = require("../../lib/cloudwatch");
function prepareData(args, adminUser) {
    return {
        slug: args.slug,
        published: args.published,
        details: {
            ...lodash_1.pick(args, 'tags', 'title', 'content', 'featured', 'thumbnail'),
            createdBy: adminUser
        }
    };
}
async function updateBlogPost(root, args, ctx) {
    ctx.internalOnly();
    const blogPost = await cl_models_1.BlogPostModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    await blogPost.update(prepareData(args, ctx.identity));
    ctx.logger.info({ blogPostId: blogPost.id }, 'blog updated');
    await cloudwatch_1.emitBlogUpdatedEvent({
        blogPostId: blogPost.id,
        identity: ctx.identity
    });
    return blogPost;
}
exports.updateBlogPost = updateBlogPost;
async function createBlogPost(root, args, ctx) {
    ctx.internalOnly();
    const blogPost = new cl_models_1.BlogPostModel(prepareData(args, ctx.identity));
    await blogPost.save();
    ctx.logger.info({ blogPostId: blogPost.id }, 'blog created');
    if (blogPost.published) {
        await cloudwatch_1.emitBlogUpdatedEvent({
            blogPostId: blogPost.id,
            identity: ctx.identity
        });
    }
    return blogPost;
}
exports.createBlogPost = createBlogPost;
