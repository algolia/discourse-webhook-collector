'use latest';

var Express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');

var server = Express();

// use express to work around 1MB payload limit
// make sure to use --no-parse when creating the webtask
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json({ limit: '50mb' }));

server.post('/', (req, res) => {

  const data = req.body;
  const context = req.webtaskContext;

  const discourseEventType = context.headers['x-discourse-event-type'];
  const discourseEvent = context.headers['x-discourse-event'];

  console.log('SendToConsole - Received webhook');
  console.log(`SendToConsole - Discourse event: ${discourseEvent}`);
  console.log(`SendToConsole - Discourse event type: ${discourseEventType}`);
  console.log('SendToConsole - JSON payload:');
  console.log(JSON.stringify(data, undefined, ' '));

  console.log('SendToConsole Success');
  res.json({ ok: true });

});

module.exports = Webtask.fromExpress(server);
