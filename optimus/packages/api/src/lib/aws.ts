import * as AWS from 'aws-sdk';
import * as config from 'config';
import { createTransport } from 'nodemailer';
import { sourceEmail } from './mailer';

AWS.config.region = config.get('aws.region');

export const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
export const s3Config = config.get('aws.s3') as {
  bucket: string;
  baseUrl: string;
  folder: string;
};

export const cloudWatchEvents = new AWS.CloudWatchEvents({
  apiVersion: '2015-10-07'
});

export const sesTransporter = createTransport({
  SES: new AWS.SES()
});

const ses2 = new AWS.SESV2();
export const sendSESEmail = (
  Destination: AWS.SESV2.Types.Destination,
  Content: AWS.SESV2.Types.EmailContent,
  FromEmailAddress: AWS.SESV2.Types.EmailAddress = sourceEmail
) =>
  ses2
    .sendEmail({
      FromEmailAddress,
      Destination,
      Content
    })
    .promise();

const sns = new AWS.SNS();
export const publishSMS = (
  PhoneNumber: AWS.SNS.Types.PhoneNumber,
  Message: AWS.SNS.Types.message
) =>
  sns
    .publish({
      PhoneNumber,
      Message
    })
    .promise();
