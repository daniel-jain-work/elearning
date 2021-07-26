import { TokenPayload } from '@cl/types';
import * as Sentry from '@sentry/node';
import {
  ApolloServer,
  AuthenticationError,
  UserInputError
} from 'apollo-server-express';
import { headerNames } from 'cl-common';
import { UserModel } from 'cl-models';
import { Request } from 'express';
import * as fs from 'fs';
import { GraphQLError } from 'graphql';
import { omit } from 'lodash';
import { nanoid } from 'nanoid';
import * as path from 'path';
import { Logger } from 'pino';
import { EmptyResultError, ValidationError } from 'sequelize';
import logger from './lib/logger';
import { createToken, decodeToken } from './lib/token-store';
import resolvers from './resolvers';

const typeDefs = fs.readFileSync(
  path.join(__dirname, '..', 'api-typedefs.graphql'),
  'utf8'
);

const services = ['appboy', 'playground'];

export class GraphqlContext {
  token: string;
  tokenRefreshed: boolean;

  readonly logger: Logger;
  readonly isAdmin: boolean;
  readonly isInternal: boolean;
  readonly identity: string = 'api';
  readonly userId: string;
  readonly teacherId: string;

  constructor(req: Request) {
    this.token = req.get(headerNames.apiToken);
    this.tokenRefreshed = false;

    if (services.includes(this.token)) {
      this.isAdmin = true;
      this.isInternal = true;
      this.identity = this.token;
    } else if (this.token) {
      try {
        const params = decodeToken(this.token) as TokenPayload;
        this.userId = params.userId;
        this.identity = params.email;
        this.teacherId = params.teacherId;
        this.isAdmin = params.isAdmin;
        this.isInternal = params.isOps || params.isAdmin;
      } catch (err) {
        logger.error(err, '%s is not a valid token', this.token);
      }
    }

    this.logger = logger.child({
      identity: this.identity,
      requestId: req.get('X-Amz-Cf-Id') || nanoid()
    });
  }

  public updateUser(user: UserModel) {
    this.tokenRefreshed = true;
    this.token = createToken(user);
  }

  public unauthorized(message: string) {
    const error = new AuthenticationError(message);
    Object.assign(error.extensions, {
      isAuthenticated: Boolean(this.userId),
      isAdmin: this.isAdmin
    });

    throw error;
  }

  public badRequest(message: string, props = {}) {
    throw new UserInputError(message, props);
  }

  public adminOnly() {
    if (!this.isAdmin) {
      this.unauthorized('Require admin user');
    }
  }

  public internalOnly() {
    if (!this.isInternal) {
      this.unauthorized('Require internal user');
    }
  }

  public ownerOrAdmin(id: string) {
    if (this.isAdmin || id === this.teacherId || id === this.userId) return;
    this.unauthorized('Require admin or owner');
  }

  public ownerOrInternal(id: string) {
    if (this.isInternal || id === this.teacherId || id === this.userId) return;
    this.unauthorized('Require internal or owner');
  }
}

function formatError(err: GraphQLError) {
  let report = true;
  let extensions = omit(err.extensions, 'exception');

  if (err.originalError instanceof ValidationError) {
    report = false;
    extensions = err.originalError.errors.reduce(
      (all, item) =>
        Object.assign(all, {
          [item.path]: item.message
        }),
      {}
    );
  }

  if (
    err.originalError instanceof UserInputError ||
    err.originalError instanceof AuthenticationError ||
    err.originalError instanceof EmptyResultError
  ) {
    logger.warn(err.originalError);
    report = false;
  }

  if (report) {
    logger.error(err, err.message);
    Sentry.withScope(scope => {
      scope.setTag('GraphQLError', err.name);
      scope.setExtra('locations', err.path);
      scope.setExtra('path', err.path);
      scope.setExtras(extensions);
      Sentry.captureException(err);
    });
  }

  return {
    extensions,
    locations: err.locations,
    message: err.message,
    path: err.path
  };
}

export const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  formatError,
  playground: true,
  introspection: true,
  context({ req }) {
    return new GraphqlContext(req);
  },
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse({ context, response }) {
            if (context.tokenRefreshed) {
              response.http.headers.set(headerNames.apiToken, context.token);
            }
          }
        };
      }
    }
  ]
});
