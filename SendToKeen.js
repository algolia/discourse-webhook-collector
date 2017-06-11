'use latest';

var Express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');
var helpers = require('./lib/helpers');

var server = Express();

// use express to work around 1MB payload limit
// make sure to use --no-parse when creating the webtask
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());

server.post('/', (req, res) => {

  try {

    const data = req.body;
    const context = req.webtaskContext;

    const discourseEventType = context.headers['x-discourse-event-type'];
    const discourseEvent = context.headers['x-discourse-event'];

    const keenCollectionName = `discourse-${discourseEvent}`;
    const keenEventBase = {
      discourse_event: discourseEvent,
      discourse_event_type: discourseEventType,
    };

    // actor may or may not be correct, the webhook doesn't provide it
    // assumption now is that actor = creator of the object in question
    // which will at least be true for all create events

    let perEventPromise;

    if (discourseEventType === 'user') {
      const actorUsername = data.user.username;
      perEventPromise = helpers.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
        Object.assign(keenEventBase, {
          user: helpers.userForEvent(userApiResponse)
        });
      });
    }

    if (discourseEventType === 'topic') {
      const actorUsername = data.topic.details.created_by.username;
      perEventPromise = helpers.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
        return helpers.getDiscourseTopic(data.topic.id, context).then((topicApiResponse) => {
          return helpers.getDiscourseCategory(topicApiResponse.category_id, context).then((category) => {
            Object.assign(keenEventBase, {
              user: helpers.userForEvent(userApiResponse),
              topic: helpers.topicForEvent(topicApiResponse),
              category: category ? helpers.categoryForEvent(category) : {}
            });
          });
        });
      });
    }

    if (discourseEventType === 'post') {
      const actorUsername = data.post.username;
      perEventPromise = helpers.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
        return helpers.getDiscourseTopic(data.post.topic_id, context).then((topicApiResponse) => {
          return helpers.getDiscoursePost(data.post.id, context).then((postApiResponse) => {
            return helpers.getDiscourseCategory(topicApiResponse.category_id, context).then((category) => {
              Object.assign(keenEventBase, {
                user: helpers.userForEvent(userApiResponse),
                post: helpers.postForEvent(postApiResponse),
                topic: helpers.topicForEvent(topicApiResponse),
                category: category ? helpers.categoryForEvent(category) : {}
              });
            });
          });
        });
      });
    }

    return perEventPromise.then(() => {

      return helpers.recordKeenEvent(keenCollectionName, keenEventBase, context);

    }).then(() => {

      console.log('SendToKeen Success');
      res.json({ ok: true });

    }).catch((error) => {

      console.error('SendToKeen Failure', error);
      console.trace(error);
      res.status(500).send(error);

    });

  } catch (error) {
    console.error('SendToKeen Error', error);
    console.trace(error);
    res.status(500).send(error);
  }

});

module.exports = Webtask.fromExpress(server);
