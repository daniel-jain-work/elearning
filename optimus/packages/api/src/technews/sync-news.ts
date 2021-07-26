import * as cheerio from 'cheerio';
import { ArticleModel } from 'cl-models';
import { request } from 'gaxios';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import { getSheetRows, RowData } from './sheets-reader';

export async function getQueueArticles() {
  return ArticleModel.findAll({
    order: [['createdAt', 'DESC']],
    where: {
      published: true,
      createdAt: {
        [Op.gt]: new Date()
      }
    }
  });
}

export async function syncNews(limit: number, logger: Logger) {
  const rows = await getSheetRows(limit);

  const knownArticles = await ArticleModel.findAll({
    attributes: ['id'],
    where: {
      id: {
        [Op.in]: Array.from(rows.keys())
      }
    }
  });

  for (const article of knownArticles) {
    logger.debug(`article ${article.id} exists already`);
    rows.delete(article.id);
  }

  const articles = await Promise.all(
    Array.from(rows.keys()).map(id => fetchArticle(id, rows.get(id), logger))
  );

  return ArticleModel.bulkCreate(articles, {
    ignoreDuplicates: true
  });
}

interface ArticleDetails extends RowData {
  title?: string;
  summary?: string;
  image?: string;
}

async function fetchArticle(id: string, row: RowData, logger: Logger) {
  const details: ArticleDetails = { ...row };
  const articleLogger = logger.child({
    url: row.url
  });

  try {
    const res = await request({
      url: row.url,
      timeout: 4000,
      responseType: 'text'
    });

    const $ = cheerio.load(res.data);

    const title =
      $('head title').text() ||
      $('meta[property="og:title"]').attr('content') ||
      $('name[name="twitter:title"]').attr('value') ||
      '';

    const summary =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    const image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('value') ||
      '';

    details.title = title.trim();
    details.summary = summary.trim();
    details.image = image.trim();

    articleLogger.info('new article fetched');
  } catch (err) {
    articleLogger.error(err);
  }

  return {
    id,
    published: null,
    details
  };
}
