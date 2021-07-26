import { commonRoutes, headerNames } from 'cl-common';
import { UserModel } from 'cl-models';
import { nanoid } from 'nanoid';
import * as supertest from 'supertest';
import { createToken } from '../lib/token-store';
import { app, graphqlKey } from '../server';

export function gql(literals: TemplateStringsArray, ...values: any[]) {
  let output = '';
  let idx = 0;
  for (; idx < values.length; idx++) {
    output += literals[idx] + values[idx];
  }

  output += literals[idx];
  return output;
}

export const apiServer = supertest(app);

export const testerToken = createToken(
  new UserModel({
    email: nanoid() + '@api.com',
    level: 20
  })
);

export function queryGraphqlAPI(query: string, variables = {}) {
  return apiServer
    .post(commonRoutes.graphql)
    .set({
      [headerNames.apiKey]: graphqlKey,
      [headerNames.apiToken]: testerToken,
      accept: 'application/json'
    })
    .send({
      query,
      variables
    })
    .expect(200);
}
