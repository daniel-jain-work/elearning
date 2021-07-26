import { Graphql } from '@cl/types';
import { defaultTimezone } from 'cl-common';
import { ArticleModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import { GraphqlContext } from '../../graphql-handler';

export async function publishArticle(
  root: any,
  args: Graphql.PublishArticleArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const { id, ...details } = args;

  const article = await ArticleModel.findByPk(id, {
    rejectOnEmpty: true
  });
  article.set('details', details);

  if (article.published) {
    // update articles
    return article.save();
  }

  article.set('published', true);

  const dt = DateTime.local().setZone(defaultTimezone);
  const queuedArticles = await ArticleModel.findAll({
    order: [['createdAt', 'asc']],
    where: {
      published: true,
      createdAt: {
        [Op.gt]: dt.toJSDate()
      }
    }
  });

  const articlesToday = await ArticleModel.count({
    where: {
      published: true,
      createdAt: {
        [Op.gte]: dt.startOf('day').toJSDate(),
        [Op.lte]: dt.endOf('day').toJSDate()
      }
    }
  });

  let createdAt = new Date();
  if (articlesToday > 2 || (articlesToday === 2 && queuedArticles.length < 5)) {
    const count = queuedArticles.length;

    if (count === 0) {
      createdAt = DateTime.local().plus({ days: 1 }).toJSDate();
    } else {
      createdAt = DateTime.fromJSDate(queuedArticles[count - 1].createdAt)
        .plus({ days: 1 })
        .toJSDate();
    }
  }

  article.setDataValue('createdAt', createdAt);

  return article.save();
}

export async function archiveArticle(
  root: any,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  ctx.internalOnly();

  const article = await ArticleModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  await article.update({
    published: false
  });

  return article;
}
