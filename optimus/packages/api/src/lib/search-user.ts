import { UserModel } from 'cl-models';
import { Op, WhereOptions } from 'sequelize';

const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9_-]+\.[a-zA-Z0-9-.]+$/;

function makeConditions(query: string): WhereOptions {
  if (emailRegex.test(query)) {
    // if the query is clearly an email, then simplify the search
    // and only search by email without any includes
    return {
      email: query
    };
  }

  const like = { [Op.like]: `%${query}%` };
  return {
    [Op.or]: [
      {
        firstName: like
      },
      {
        lastName: like
      },
      {
        email: like
      },
      {
        '$children.name$': like
      }
    ]
  };
}

export async function searchUser(rawQuery: string, limit = 10) {
  const query = rawQuery.trim();

  // for too short request do not return any results
  if (query.length < 2) {
    return [];
  }

  return UserModel.scope('children').findAll({
    where: makeConditions(query),
    limit,
    order: [['createdAt', 'DESC']],
    subQuery: false // need to allow both `include` and `limit` in the same query
  });
}
