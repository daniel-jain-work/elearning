import * as config from 'config';
import * as pino from 'pino';
export default pino({
  ...config.get('logger'),
  formatters: {
    level: level => ({
      level
    })
  }
});
