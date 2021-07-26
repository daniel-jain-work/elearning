"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRequest = exports.runCronJob = exports.gql = void 0;
const cl_common_1 = require("cl-common");
const config = require("config");
const gaxios_1 = require("gaxios");
const apiEndpoint = config.get('graphql.api');
const apiKey = config.get('graphql.key');
const headers = {
    'Content-Type': 'application/json',
    [cl_common_1.headerNames.apiKey]: apiKey,
    [cl_common_1.headerNames.apiToken]: 'appboy'
};
// to trigger syntax highlight like graphql-tag
function gql(literals, ...values) {
    let output = '';
    let idx = 0;
    for (; idx < values.length; idx++) {
        output += literals[idx] + values[idx];
    }
    output += literals[idx];
    return output;
}
exports.gql = gql;
exports.runCronJob = (evt) => gaxios_1.request({
    url: apiEndpoint + '/cronjob/' + evt.type,
    headers,
    method: 'POST',
    body: JSON.stringify(evt)
});
async function apiRequest(query, variables) {
    const res = await gaxios_1.request({
        url: apiEndpoint + cl_common_1.commonRoutes.graphql,
        headers,
        method: 'POST',
        body: JSON.stringify({
            query,
            variables
        })
    });
    if (res.data && !res.data.errors) {
        return res.data.data;
    }
    throw new gaxios_1.GaxiosError('Graphql API Error', res.config, res);
}
exports.apiRequest = apiRequest;
