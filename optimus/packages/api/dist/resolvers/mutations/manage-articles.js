"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveArticle = exports.publishArticle = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
async function publishArticle(root, args, ctx) {
    ctx.internalOnly();
    const { id, ...details } = args;
    const article = await cl_models_1.ArticleModel.findByPk(id, {
        rejectOnEmpty: true
    });
    article.set('details', details);
    if (article.published) {
        // update articles
        return article.save();
    }
    article.set('published', true);
    const dt = luxon_1.DateTime.local().setZone(cl_common_1.defaultTimezone);
    const queuedArticles = await cl_models_1.ArticleModel.findAll({
        order: [['createdAt', 'asc']],
        where: {
            published: true,
            createdAt: {
                [sequelize_1.Op.gt]: dt.toJSDate()
            }
        }
    });
    const articlesToday = await cl_models_1.ArticleModel.count({
        where: {
            published: true,
            createdAt: {
                [sequelize_1.Op.gte]: dt.startOf('day').toJSDate(),
                [sequelize_1.Op.lte]: dt.endOf('day').toJSDate()
            }
        }
    });
    let createdAt = new Date();
    if (articlesToday > 2 || (articlesToday === 2 && queuedArticles.length < 5)) {
        const count = queuedArticles.length;
        if (count === 0) {
            createdAt = luxon_1.DateTime.local().plus({ days: 1 }).toJSDate();
        }
        else {
            createdAt = luxon_1.DateTime.fromJSDate(queuedArticles[count - 1].createdAt)
                .plus({ days: 1 })
                .toJSDate();
        }
    }
    article.setDataValue('createdAt', createdAt);
    return article.save();
}
exports.publishArticle = publishArticle;
async function archiveArticle(root, args, ctx) {
    ctx.internalOnly();
    const article = await cl_models_1.ArticleModel.findByPk(args.id, {
        rejectOnEmpty: true
    });
    await article.update({
        published: false
    });
    return article;
}
exports.archiveArticle = archiveArticle;
