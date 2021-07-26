import * as Sentry from '@sentry/node';
import * as config from 'config';
import * as express from 'express';
import { cronjobHandler, cronjobPath } from './cronjob';
import { invoiceHandler, invoicePath } from './lib/invoice-tpl';
import logger from './lib/logger';
import { app } from './server';
import { handleWebhook } from './zoomtopia/zoom-webhooks';

Sentry.init(config.get('sentry'));

const port = config.get('port') as number;
const webhookToken = config.get('zoom.webhooks.token') as string;

// help debugging, invoice is attached to confirmatin email automatically
app.get(invoicePath, invoiceHandler);

// cloudwatch events cannot be configured to talk to rest api directly, relayed by dispatcher
app.post(cronjobPath, express.json(), cronjobHandler);

app.post('/zoom-webhook', express.json({ limit: '1024kb' }), async (req, res) => {
  if (req.get('Authorization') !== webhookToken) {
    return res.status(401).end('UNAUTHENTICATED');
  }

  try {
    await handleWebhook(req.body);
    res.end('OK');
  } catch (err) {
    logger.error(err, 'fail to handle webhook event');
    Sentry.withScope(scope => {
      scope.setTag('type', 'Zoom Webhook');
      scope.setExtra('event', req.body);
      Sentry.captureException(err);
    });

    res.status(500).end(err.message);
  }
});

app.listen(port, () => {
  logger.info('🚀 started at http://localhost:%d', port);
});
