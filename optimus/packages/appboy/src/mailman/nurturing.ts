import { UnsubscribeGroups } from 'cl-common';
import { EmailCampaignModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import { MsCEO, Personalization, sendTemplatedEmail } from '../mailer';
import { createRecipient, createUserParams } from '../mailer-utils';
import {
  addInactiveStudents,
  addInactiveUsers,
  campaignName,
  getActiveCampaigners,
  totalStages
} from './campaigner-utils';

export async function moveUsersToNuringCampaign(now: DateTime, fLogger: Logger) {
  const candidates = new Set<string>();
  await addInactiveUsers(now, candidates, fLogger);
  await addInactiveStudents(now, candidates, fLogger);

  if (candidates.size > 0) {
    const records = Array.from(candidates.values()).map(userId => ({
      campaign: campaignName,
      userId
    }));

    await EmailCampaignModel.bulkCreate(records, {
      ignoreDuplicates: true
    });
  }
}

export async function runNurturingCampaign(now: DateTime, fLogger: Logger) {
  const campaigners = await getActiveCampaigners(now);
  const toBeUpdated: Record<string, any>[] = [];
  const toBeDeleted: string[] = [];

  const emailRecievers: { templateId: string; recipients: Personalization[] }[] = [
    {
      templateId: 'd-44d1eb10e1cb4ba9b29be87d541623bf',
      recipients: []
    },
    {
      templateId: 'd-a422b88ba71b49c8b1f9e5ea7e04cdf8',
      recipients: []
    },
    {
      templateId: 'd-728cd39ad28e4f9abd9f9dd1039f330e',
      recipients: []
    },
    {
      templateId: 'd-d7315a8534484dd2b61ab4ed23dbc288',
      recipients: []
    }
  ];

  for (const campaigner of campaigners) {
    if (campaigner.user.paid) {
      toBeDeleted.push(campaigner.id);
      continue;
    }

    emailRecievers[campaigner.stage].recipients.push({
      to: createRecipient(campaigner.user),
      customArgs: { amp_user_id: campaigner.userId },
      dynamicTemplateData: createUserParams(campaigner.user)
    });

    toBeUpdated.push({
      id: campaigner.id,
      campaign: campaigner.campaign,
      stage: campaigner.stage + 1,
      userId: campaigner.userId,
      sentAt: now.toJSDate()
    });

    // done with the last email
    if (campaigner.stage === totalStages - 1) {
      toBeDeleted.push(campaigner.id);
    }
  }

  if (toBeUpdated.length > 0) {
    fLogger.info('move %d users to next stage', toBeUpdated.length);
    await EmailCampaignModel.bulkCreate(toBeUpdated, {
      updateOnDuplicate: ['stage', 'sentAt', 'updatedAt']
    });
  }

  if (toBeDeleted.length > 0) {
    fLogger.info('move %d users out of campaign', toBeDeleted.length);
    await EmailCampaignModel.destroy({
      where: {
        id: {
          [Op.in]: toBeDeleted
        }
      }
    });
  }

  await Promise.all(
    emailRecievers.map((er, idx) => {
      if (er.recipients.length === 0) {
        return;
      }

      return sendTemplatedEmail(
        {
          from: MsCEO,
          templateId: er.templateId,
          personalizations: er.recipients,
          asm: {
            groupId: UnsubscribeGroups.Newsletter
          }
        },
        {
          source: `c${idx + 1}`,
          campaign: 'nurturing'
        }
      );
    })
  );
}
