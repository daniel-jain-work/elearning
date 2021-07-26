"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTrialAttended = void 0;
const api_client_1 = require("./api-client");
const model_types_1 = require("./model-types");
const segment_1 = require("./segment");
const GetUserQuery = api_client_1.gql `
  ${model_types_1.UserFragment}
  query($id: ID!) {
    user(id: $id) {
      ...UserFragment
    }
  }
`;
async function handleTrialAttended(payload, fLogger) {
    const { user } = await api_client_1.apiRequest(GetUserQuery, {
        id: payload.userId
    });
    await segment_1.track(user, {
        event: 'AttendTrial',
        timestamp: new Date(payload.timestamp),
        properties: {
            content_name: payload.contentName,
            content_ids: [payload.contentId]
        }
    }, fLogger);
}
exports.handleTrialAttended = handleTrialAttended;
