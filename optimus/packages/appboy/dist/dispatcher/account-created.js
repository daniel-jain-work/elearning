"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAccountCreated = void 0;
const cl_common_1 = require("cl-common");
const mailer_1 = require("../mailer");
const mailer_utils_1 = require("../mailer-utils");
const api_client_1 = require("./api-client");
const model_types_1 = require("./model-types");
const TagUserGeolocationMutation = api_client_1.gql `
  ${model_types_1.UserFragment}
  mutation($id: ID!) {
    user: tagUserGeolocation(id: $id) {
      ...UserFragment
    }
  }
`;
async function handleAccountCreated(payload, fLogger) {
    const { user } = await api_client_1.apiRequest(TagUserGeolocationMutation, { id: payload.id });
    fLogger.info('%s created an account', user.fullName);
    await mailer_1.sendTemplatedEmail({
        from: mailer_1.MsCEO,
        templateId: 'd-037a9827dd184e0096c59674354fd9b8',
        to: mailer_utils_1.createRecipient(user),
        dynamicTemplateData: mailer_utils_1.createUserParams(user),
        asm: {
            groupId: cl_common_1.UnsubscribeGroups.Classes
        },
        category: 'welcome',
        customArgs: {
            amp_user_id: user.id
        }
    });
}
exports.handleAccountCreated = handleAccountCreated;
