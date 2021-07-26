import { UserModel } from 'cl-models';
import * as config from 'config';
import { request } from 'gaxios';
import { Logger } from 'pino';

interface Response {
  ip: string;
  country_code: string;
  country_name: string;
  region_code: string;
  region_name: string;
  city: string;
  zip: string;
}

const accessKey: string = config.get('ipstack.key');

export async function geoTagUser(user: UserModel, fLogger: Logger) {
  if (!user.clientIp) {
    return;
  }

  try {
    const result = await request<Response>({
      url: `http://api.ipstack.com/` + user.clientIp,
      timeout: 5000,
      params: {
        access_key: accessKey
      }
    });

    fLogger.info({ result: result.data }, 'reverse geocode %s', user.clientIp);

    await user.setDetails({
      country: result.data.country_name,
      state: result.data.region_name,
      city: result.data.city
    });
  } catch (err) {
    fLogger.error(err, 'reverse geocode failed for %s', user.email);
  }
}
