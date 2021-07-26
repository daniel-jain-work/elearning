import { Graphql } from '@cl/types';
import Bottleneck from 'bottleneck';
import * as config from 'config';
import { request } from 'gaxios';
import { Logger } from 'pino';

const wxCfg = config.get('wx') as {
  name: string;
  appId: string;
  appSecret: string;
};

const rateLimiter = new Bottleneck({
  minTime: 250,
  maxConcurrent: 2
});

interface ErrorResult {
  errcode: number;
  errmsg: string;
}

async function getAccessToken() {
  const result = await rateLimiter.schedule(() =>
    request<{ access_token: string; expires_in: number } | ErrorResult>({
      url: 'https://api.weixin.qq.com/cgi-bin/token',
      params: {
        grant_type: 'client_credential',
        appid: wxCfg.appId,
        secret: wxCfg.appSecret
      }
    })
  );

  if (result.status !== 200) {
    throw new Error(result.statusText);
  }

  if ('errmsg' in result.data) {
    throw new Error(result.data.errmsg);
  }

  return result.data;
}

export async function createQRCode(
  data: Graphql.GenerateQRCodeArgs,
  logger: Logger
) {
  const token = await getAccessToken();
  logger.info('gets a valid access token expiring in %d seconds', token.expires_in);

  const result = await request<{ ticket: string; url: string } | ErrorResult>({
    url: 'https://api.weixin.qq.com/cgi-bin/qrcode/create',
    method: 'POST',
    params: token,
    data: {
      action_name: data.action,
      action_info: {
        scene: {
          scene_str: data.scene
        }
      }
    }
  });

  if (result.status !== 200) {
    logger.error(result);
    throw new Error(result.statusText);
  }

  if ('errmsg' in result.data) {
    logger.error(result);
    throw new Error(result.data.errmsg);
  }

  return {
    image:
      'https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=' + result.data.ticket,
    url: result.data.url
  };
}
