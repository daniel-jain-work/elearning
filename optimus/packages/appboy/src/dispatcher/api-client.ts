import { WebEvent } from '@cl/types';
import { headerNames, commonRoutes } from 'cl-common';
import * as config from 'config';
import { GaxiosError, request } from 'gaxios';

const apiEndpoint = config.get('graphql.api') as string;
const apiKey = config.get('graphql.key') as string;

const headers = {
  'Content-Type': 'application/json',
  [headerNames.apiKey]: apiKey,
  [headerNames.apiToken]: 'appboy'
};

interface GraphqlError {
  message: string;
  locations: string[];
  path: string;
  extentions: any[];
}

// to trigger syntax highlight like graphql-tag
export function gql(literals: TemplateStringsArray, ...values: any[]) {
  let output = '';
  let idx = 0;
  for (; idx < values.length; idx++) {
    output += literals[idx] + values[idx];
  }

  output += literals[idx];
  return output;
}

export const runCronJob = (evt: WebEvent) =>
  request({
    url: apiEndpoint + '/cronjob/' + evt.type,
    headers,
    method: 'POST',
    body: JSON.stringify(evt)
  });

export async function apiRequest<TData, TVariables>(
  query: string,
  variables?: TVariables
) {
  const res = await request<{ data: TData; errors?: GraphqlError[] }>({
    url: apiEndpoint + commonRoutes.graphql,
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

  throw new GaxiosError('Graphql API Error', res.config, res);
}
