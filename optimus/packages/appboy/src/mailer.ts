import { MailData, MailDataRequired } from '@sendgrid/helpers/classes/mail';
import { PersonalizationData } from '@sendgrid/helpers/classes/personalization';
import { send, setApiKey } from '@sendgrid/mail';
import * as Sentry from '@sentry/node';
import Bottleneck from 'bottleneck';
import * as config from 'config';
import { Logger } from 'pino';
import logger from './logger';

const prefix =
  config.util.getEnv('NODE_ENV') === 'production' ? 'Create & Learn' : 'Appboy';

export const supportEmail = config.get('email.support') as string;
export const defaultEmail = config.get('email.classes') as string;
export const ClassMaster = `${prefix} <${config.get('email.classes')}>`;
export const MrReminder = `${prefix} Reminder <${defaultEmail}>`;
export const MsOps = config.get('email.ops') as string;
export const MsCEO = config.get('email.ceo') as string;

// sendgrid
export interface Personalization extends Omit<PersonalizationData, 'customArgs'> {
  customArgs?: {
    amp_user_id: string;
  };
}

export interface EmailOpts
  extends Omit<MailData, 'personalizations' | 'templateId' | 'customArgs'> {
  templateId: string;
  personalizations?: Personalization[];
  customArgs?: {
    amp_user_id: string;
  };
}

setApiKey(config.get('sendgrid.apiKey'));

const sandbox = config.get('sendgrid.sandbox') as boolean;
const batchSize = 750;
const rateLimiter = new Bottleneck({
  minTime: 250,
  maxConcurrent: 1
});

async function sendgridSend(data: MailDataRequired, logger: Logger) {
  try {
    await rateLimiter.schedule(() => send(data));
    if (data.personalizations) {
      logger.info('sent email to %d users', data.personalizations.length);
    } else {
      logger.info('sent email to %o', data.to);
    }
  } catch (err) {
    logger.error(err, 'fail to send templated email');
    Sentry.withScope(scope => {
      scope.setTag('service', 'sendgrid');
      Sentry.captureException(err);
    });
  }
}

export async function sendTemplatedEmail(
  opts: EmailOpts,
  ga?: {
    source: string;
    campaign: string;
  }
) {
  if (sandbox) {
    return send({
      ...opts,
      mailSettings: {
        sandboxMode: { enable: true }
      }
    });
  }

  if (ga) {
    opts.trackingSettings = {
      ganalytics: {
        enable: true,
        utmCampaign: ga.campaign,
        utmSource: ga.source,
        utmMedium: 'email'
      }
    };
  }

  const eLogger = logger.child({
    templateId: opts.templateId,
    category: opts.category
  });

  const { personalizations, ...data } = opts;
  // sendgrid limits to 1000 recipients
  if (!personalizations || personalizations.length <= batchSize) {
    return await sendgridSend(opts, eLogger);
  }

  eLogger.info('send a big batch emails (%d recipients)', personalizations.length);

  const batches: EmailOpts[] = [];
  for (let i = 0; i < personalizations.length / batchSize; i++) {
    const start = i * batchSize;
    batches[i] = {
      ...data,
      personalizations: personalizations.slice(start, start + batchSize)
    };
  }

  await Promise.all(batches.map(batch => sendgridSend(batch, eLogger)));
}
