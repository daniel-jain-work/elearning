"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const ipstack_1 = require("../lib/ipstack");
const mailer_1 = require("../lib/mailer");
const mailer_utils_1 = require("../lib/mailer-utils");
const segment_1 = require("../lib/segment");
async function handleAccountCreated(payload) {
    const user = await cl_models_1.UserModel.findByPk(payload.id, {
        rejectOnEmpty: true
    });
    await ipstack_1.geoTagUser(user);
    await segment_1.track(user, {
        event: 'CompleteRegistration',
        timestamp: user.createdAt,
        properties: {
            source: user.refererId ? 'Referral' : user.source
        }
    });
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
