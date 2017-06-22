'use latest';

var Express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');

var discourse = require('./lib/discourse');
var keen = require('./lib/keen');

var server = Express();

// use express to work around 1MB payload limit
// make sure to use --no-parse when creating the webtask
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json({ limit: '50mb' }));

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
      perEventPromise = discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
        Object.assign(keenEventBase, {
          user: keen.userForEvent(userApiResponse)
        });
      });
    }

    if (discourseEventType === 'topic') {
      perEventPromise = discourse.getDiscourseTopic(data.topic.id, context).then((topicApiResponse) => {
        const actorUsername = topicApiResponse.details.created_by.username;
        const categoryId = topicApiResponse.category_id;
        return discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
          return discourse.getDiscourseCategory(categoryId, context).then((category) => {
            Object.assign(keenEventBase, {
              user: keen.userForEvent(userApiResponse),
              topic: keen.topicForEvent(topicApiResponse),
              category: category ? keen.categoryForEvent(category) : {}
            });
          });
        });
      });
    }

    if (discourseEventType === 'post') {
      perEventPromise = discourse.getDiscoursePost(data.post.id, context).then((postApiResponse)  => {
        return discourse.getDiscourseTopic(postApiResponse.topic_id, context).then((topicApiResponse) => {
          const categoryId = topicApiResponse.category_id;
          const actorUsername = postApiResponse.username;
          return discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
            return discourse.getDiscourseCategory(categoryId, context).then((category) => {
              Object.assign(keenEventBase, {
                user: keen.userForEvent(userApiResponse),
                post: keen.postForEvent(postApiResponse),
                topic: keen.topicForEvent(topicApiResponse),
                category: category ? keen.categoryForEvent(category) : {}
              });
            });
          });
        });
      });
    }

    return perEventPromise.then(() => {

      return keen.recordKeenEvent(keenCollectionName, keenEventBase, context);

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
