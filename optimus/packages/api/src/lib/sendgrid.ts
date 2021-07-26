import * as client from '@sendgrid/client';
import { MailDataRequired } from '@sendgrid/helpers/classes/mail';
import * as mail from '@sendgrid/mail';
import * as config from 'config';

// sendgrid
const options: {
  apiKey: string;
  sandbox: boolean;
  contactListIds: string[];
} = config.get('sendgrid');

client.setApiKey(options.apiKey);
mail.setApiKey(options.apiKey);

export const mailSend = (
  data: MailDataRequired,
  ga?: {
    source: string;
    campaign: string;
  }
) => {
  if (options.sandbox) {
    data.mailSettings = {
      sandboxMode: { enable: true }
    };
  } else if (ga) {
    data.trackingSettings = {
      ganalytics: {
        enable: true,
        utmCampaign: ga.campaign,
        utmSource: ga.source,
        utmMedium: 'email'
      }
    };
  }

  return mail.send(data);
};

export interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  // custom fields
  student_name: string;
  student_age: number;
  purchases: number;
  trials: number;
  ai_level?: number;
  python_level?: number;
  scratch_level?: number;
  robots_level?: number;
  minecraft_level?: number;
  webinars?: string;
}

const customFields = {
  student_name: 'e11_T',
  student_age: 'e17_N',
  purchases: 'e13_N',
  trials: 'e19_N',
  ai_level: 'w25_N',
  python_level: 'w22_N',
  scratch_level: 'e18_N',
  robots_level: 'w24_N',
  minecraft_level: 'w23_N',
  webinars: 'e21_T'
};

export const upsertContacts = (items: Contact[]) =>
  client.request({
    baseUrl: 'https://api.sendgrid.com/',
    url: '/v3/marketing/contacts',
    method: 'PUT',
    body: {
      list_ids: options.contactListIds,
      contacts: items.map(item => {
        const { first_name, last_name, email, country, ...others } = item;
        return {
          first_name,
          last_name,
          email,
          country,
          custom_fields: Object.keys(others).reduce((data, key) => {
            data[customFields[key]] = others[key];
            return data;
          }, {})
        };
      })
    }
  });
