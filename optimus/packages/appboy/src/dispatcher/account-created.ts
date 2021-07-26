import { Graphql, WebEvents } from '@cl/types';
import { UnsubscribeGroups } from 'cl-common';
import { Logger } from 'pino';
import { MsCEO, sendTemplatedEmail } from '../mailer';
import { createRecipient, createUserParams } from '../mailer-utils';
import { apiRequest, gql } from './api-client';
import { User, UserFragment } from './model-types';

const TagUserGeolocationMutation = gql`
  ${UserFragment}
  mutation($id: ID!) {
    user: tagUserGeolocation(id: $id) {
      ...UserFragment
    }
  }
`;

export async function handleAccountCreated(
  payload: WebEvents.AccountCreatedEvent['payload'],
  fLogger: Logger
) {
  const { user } = await apiRequest<{ user: User }, Graphql.IdArgs>(
    TagUserGeolocationMutation,
    { id: payload.id }
  );

  fLogger.info('%s created an account', user.fullName);

  await sendTemplatedEmail({
    from: MsCEO,
    templateId: 'd-037a9827dd184e0096c59674354fd9b8',
    to: createRecipient(user),
    dynamicTemplateData: createUserParams(user),
    asm: {
      groupId: UnsubscribeGroups.Classes
    },
    category: 'welcome',
    customArgs: {
      amp_user_id: user.id
    }
  });
}
