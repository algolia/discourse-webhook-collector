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

    let perEventPromise;

    if (discourseEventType === 'user') {
      const actorUsername = data.user.username;
      perEventPromise = helpers.getDiscourseUser(actorUsername, context).then((userApiResponse) => {

        const user = userApiResponse.user;
        const title = '';

        const attachment = helpers.getSimpleSlackAttachment(user, title, '', '', context);
        attachment.color = '#3369E7';
        attachment.footer = `Discourse: ${discourseEvent}`;

        return helpers.postSlackMessage({
          attachments: [attachment]
        }, context.secrets.SLACK_WEBHOOK_URL);

      });
    }

    if (discourseEventType === 'topic') {
      const actorUsername = data.topic.details.created_by.username;
      perEventPromise = helpers.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
        return helpers.getDiscourseTopic(data.topic.id, context).then((topicApiResponse) => {
          return helpers.getDiscourseCategory(topicApiResponse.category_id, context).then((category) => {

            const topic = topicApiResponse;
            const user = userApiResponse.user;

            const title = `[${category.name}] ${topic.title}`;
            const titleLink = helpers.link(`t/${topic.slug}/${topic.id}`, context);

            const attachment = helpers.getSimpleSlackAttachment(user, title, titleLink, '', context);
            helpers.addTagsField(attachment, topic, context);
            attachment.color = category.color;
            attachment.footer = `Discourse: ${discourseEvent}`;

            return helpers.postSlackMessage({
              attachments: [attachment]
            }, context.secrets.SLACK_WEBHOOK_URL);

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

              const topic = topicApiResponse;
              const user = userApiResponse.user;

              const title = `[${category.name}] ${topic.title}`;
              const titleLink = helpers.link(`t/${topic.slug}/${topic.id}/${postApiResponse.post_number}`, context);

              const attachment = helpers.getSimpleSlackAttachment(user, title, titleLink, postApiResponse.raw, context);
              helpers.addTagsField(attachment, topicApiResponse, context);
              attachment.color = category.color;
              attachment.footer = `Discourse: ${discourseEvent}`;

              return helpers.postSlackMessage({
                attachments: [attachment]
              }, context.secrets.SLACK_WEBHOOK_URL);

            });
          });
        });
      });
    }

    return perEventPromise.then(() => {

      console.log('SendToSlack Success');
      res.json({ ok: true });

    }).catch((error) => {

      console.error('SendToSlack Failure', error);
      console.trace(error);
      res.status(500).send(error);

    });

  } catch (error) {
    console.error('SendToSlack Error', error);
    console.trace(error);
    res.status(500).send(error);
  }

});

module.exports = Webtask.fromExpress(server);
