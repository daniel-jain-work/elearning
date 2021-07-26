import { MailData } from '@sendgrid/helpers/classes/mail';
import { PersonalizationData } from '@sendgrid/helpers/classes/personalization';
import * as Sentry from '@sentry/node';
import * as config from 'config';
import logger from './logger';
import { mailSend } from './sendgrid';

const prefix =
  config.util.getEnv('NODE_ENV') === 'production' ? 'Create & Learn' : 'API';

const defaultEmail = config.get('email.classes');

export const sourceEmail = `${prefix} <${config.get('email.source')}>`;
export const ClassMaster = `${prefix} <${defaultEmail}>`;
export const MsOps = `Amy (${prefix}) <${config.get('email.ops')}>`;
export const MrScheduler = `Mr. Scheduler <${defaultEmail}>`;
export const MrNewsman = `Mr. Newsman <${defaultEmail}>`;
export const TeacherSupport = config.get('email.support') as string;
export const Treasurer = config.get('email.purchases') as string;

// key name https://github.com/sendgrid/sendgrid-nodejs/issues/902
// value type https://github.com/sendgrid/sendgrid-nodejs/pull/868
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

export async function sendTemplatedEmail(
  opts: EmailOpts,
  ga?: {
    source: string;
    campaign: string;
  }
) {
  try {
    logger.debug(opts, 'sendTemplatedEmail %s', opts.templateId);
    await mailSend(opts, ga);
  } catch (err) {
    Sentry.withScope(scope => {
      scope.setTag('service', 'sendgrid');
      Sentry.captureException(err);
    });

    logger.error({ err }, 'fail to send email');
  }
}
