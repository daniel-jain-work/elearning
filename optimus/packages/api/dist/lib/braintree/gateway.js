"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const braintree_1 = require("braintree");
const config = require("config");
exports.default = new braintree_1.BraintreeGateway({
    environment: braintree_1.Environment[config.get('braintree.environment')],
    merchantId: config.get('braintree.merchantId'),
    publicKey: config.get('braintree.publicKey'),
    privateKey: config.get('braintree.privateKey')
});
