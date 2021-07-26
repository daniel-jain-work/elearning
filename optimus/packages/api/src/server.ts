import * as Sentry from '@sentry/node';
import { commonRoutes, headerNames } from 'cl-common';
import * as compression from 'compression';
import * as config from 'config';
import * as express from 'express';
import { cronjobPath } from './cronjob';
import { apolloServer } from './graphql-handler';

export const graphqlKey = config.get('graphql.key') as string;
export const app = express();

app.set('trust proxy', true);

app.use(Sentry.Handlers.requestHandler());
app.use(compression());
app.use(Sentry.Handlers.errorHandler());

if (graphqlKey) {
  const authMiddleware: express.RequestHandler = (req, res, next) => {
    if (req.get(headerNames.apiKey) !== graphqlKey) {
      res.status(401).send('UNAUTHENTICATED');
    } else {
      next();
    }
  };

  app.post(commonRoutes.graphql, authMiddleware);
  app.post(cronjobPath, authMiddleware);
}

apolloServer.applyMiddleware({
  app,
  cors: true,
  path: commonRoutes.graphql,
  bodyParserConfig: {
    limit: '8mb'
  }
});

app.get('/', (req, res) => res.send('😀'));
