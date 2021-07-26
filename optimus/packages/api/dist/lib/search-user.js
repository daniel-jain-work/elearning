"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUser = void 0;
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9_-]+\.[a-zA-Z0-9-.]+$/;
function makeConditions(query) {
    if (emailRegex.test(query)) {
        // if the query is clearly an email, then simplify the search
        // and only search by email without any includes
        return {
            email: query
        };
    }
    const like = { [sequelize_1.Op.like]: `%${query}%` };
    return {
        [sequelize_1.Op.or]: [
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
async function searchUser(rawQuery, limit = 10) {
    const query = rawQuery.trim();
    // for too short request do not return any results
    if (query.length < 2) {
        return [];
    }
    return cl_models_1.UserModel.scope('children').findAll({
        where: makeConditions(query),
        limit,
        order: [['createdAt', 'DESC']],
        subQuery: false // need to allow both `include` and `limit` in the same query
    });
}
exports.searchUser = searchUser;
