import { CreditType, UnsubscribeGroups } from 'cl-common';
import { CreditModel, UserModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { Op } from 'sequelize';
import { MsOps, sendTemplatedEmail } from '../mailer';
import { createRecipient, createUserParams } from '../mailer-utils';

export async function notifyCreditRewards(now: DateTime, fLogger: Logger) {
  const startTime = now.minus({
    days: 1
  });

  const credits = await CreditModel.findAll({
    include: [
      {
        model: UserModel,
        required: true
      }
    ],
    where: {
      type: CreditType.Referral,
      createdAt: {
        [Op.between]: [
          startTime.startOf('day').toJSON(),
          startTime.endOf('day').toJSON()
        ]
      }
    }
  });

  const personalizationsList = await Promise.all(
    credits.map(async credit => {
      const referral = await UserModel.findByPk(credit.attribution.userId);
      if (!referral || !referral.accountChangeNotification) {
        fLogger.error(`Referral user ${credit.attribution.userId} not found!`);
        return null;
      }

      return {
        to: createRecipient(credit.user),
        customArgs: {
          amp_user_id: credit.userId
        },
        dynamicTemplateData: {
          ...createUserParams(credit.user),
          referralName: referral.firstName,
          amount: credit.cents / 100
        }
      };
    })
  );

  const personalizations = personalizationsList.filter(Boolean);

  if (personalizations.length > 0) {
    await sendTemplatedEmail({
      from: MsOps,
      templateId: 'd-1bbfc439e88246bebcacb0a9c52e8385',
      asm: { groupId: UnsubscribeGroups.Classes },
      personalizations
    });
  }
}
