const { server, serverPort } = require('cl-next-app');
const { commonRoutes } = require('cl-common');
const next = require('next');
const console = require('console');

// render next app
const app = next({ dev: process.env.NODE_ENV !== 'production' });
const handleRequest = app.getRequestHandler();

server.get('/_next/*', (req, res) => handleRequest(req, res));
server.get('/platform-course', (req, res) => {
  res.statusCode = 302;
  res.setHeader('Location', '/courses');
  res.end();
});

server.get(commonRoutes.signin, (req, res) => handleRequest(req, res));

server.get('*', (req, res) => {
  if (req.passport) {
    return handleRequest(req, res);
  }

  let target = commonRoutes.signin;
  if (req.path && req.path !== '/') {
    target += '?next=' + encodeURIComponent(req.path);
  }

  res.statusCode = 302;
  res.setHeader('Location', target);
  res.end();
});

app
  .prepare()
  .then(() => server.start(serverPort))
  .then(() => {
    console.log('server started at http://localhost:%d', serverPort);
  });
