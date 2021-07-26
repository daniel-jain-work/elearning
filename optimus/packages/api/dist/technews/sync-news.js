"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncNews = exports.getQueueArticles = void 0;
const cheerio = require("cheerio");
const cl_models_1 = require("cl-models");
const gaxios_1 = require("gaxios");
const sequelize_1 = require("sequelize");
const sheets_reader_1 = require("./sheets-reader");
async function getQueueArticles() {
    return cl_models_1.ArticleModel.findAll({
        order: [['createdAt', 'DESC']],
        where: {
            published: true,
            createdAt: {
                [sequelize_1.Op.gt]: new Date()
            }
        }
    });
}
exports.getQueueArticles = getQueueArticles;
async function syncNews(limit, logger) {
    const rows = await sheets_reader_1.getSheetRows(limit);
    const knownArticles = await cl_models_1.ArticleModel.findAll({
        attributes: ['id'],
        where: {
            id: {
                [sequelize_1.Op.in]: Array.from(rows.keys())
            }
        }
    });
    for (const article of knownArticles) {
        logger.debug(`article ${article.id} exists already`);
        rows.delete(article.id);
    }
    const articles = await Promise.all(Array.from(rows.keys()).map(id => fetchArticle(id, rows.get(id), logger)));
    return cl_models_1.ArticleModel.bulkCreate(articles, {
        ignoreDuplicates: true
    });
}
exports.syncNews = syncNews;
async function fetchArticle(id, row, logger) {
    const details = { ...row };
    const articleLogger = logger.child({
        url: row.url
    });
    try {
        const res = await gaxios_1.request({
            url: row.url,
            timeout: 4000,
            responseType: 'text'
        });
        const $ = cheerio.load(res.data);
        const title = $('head title').text() ||
            $('meta[property="og:title"]').attr('content') ||
            $('name[name="twitter:title"]').attr('value') ||
            '';
        const summary = $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') ||
            '';
        const image = $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('value') ||
            '';
        details.title = title.trim();
        details.summary = summary.trim();
        details.image = image.trim();
        articleLogger.info('new article fetched');
    }
    catch (err) {
        articleLogger.error(err);
    }
    return {
        id,
        published: null,
        details
    };
}
