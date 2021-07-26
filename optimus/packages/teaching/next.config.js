const config = require('config');

module.exports = {
  typescript: {
    ignoreDevErrors: true
  },
  publicRuntimeConfig: {
    sentry: config.get('sentry'),
    segment: config.get('segment')
  }
};
