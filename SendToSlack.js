'use latest';

var Express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');

var discourse = require('./lib/discourse');
var slack = require('./lib/slack');

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
      perEventPromise = discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {

        const user = userApiResponse.user;
        const title = '';

        const attachment = slack.getSimpleSlackAttachment(user, title, '', '', context);
        attachment.color = '#3369E7';
        attachment.footer = `Discourse: ${discourseEvent}`;

        return slack.postSlackMessage({
          attachments: [attachment]
        }, context.secrets.SLACK_WEBHOOK_URL);

      });
    }

    if (discourseEventType === 'topic') {
      const actorUsername = data.topic.details.created_by.username;
      perEventPromise = discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
        return discourse.getDiscourseTopic(data.topic.id, context).then((topicApiResponse) => {
          return discourse.getDiscourseCategory(topicApiResponse.category_id, context).then((category) => {

            const topic = topicApiResponse;
            const user = userApiResponse.user;

            const title = `[${category.name}] ${topic.title}`;
            const titleLink = discourse.link(`t/${topic.slug}/${topic.id}`, context);

            const attachment = slack.getSimpleSlackAttachment(user, title, titleLink, '', context);
            slack.addTagsField(attachment, topic, context);
            attachment.color = category.color;
            attachment.footer = `Discourse: ${discourseEvent}`;

            return slack.postSlackMessage({
              attachments: [attachment]
            }, context.secrets.SLACK_WEBHOOK_URL);

          });
        });
      });
    }

    if (discourseEventType === 'post') {
      const actorUsername = data.post.username;
      perEventPromise = discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
        return discourse.getDiscourseTopic(data.post.topic_id, context).then((topicApiResponse) => {
          return discourse.getDiscoursePost(data.post.id, context).then((postApiResponse) => {
            return discourse.getDiscourseCategory(topicApiResponse.category_id, context).then((category) => {

              const topic = topicApiResponse;
              const user = userApiResponse.user;

              const title = `[${category.name}] ${topic.title}`;
              const titleLink = discourse.link(`t/${topic.slug}/${topic.id}/${postApiResponse.post_number}`, context);

              const attachment = slack.getSimpleSlackAttachment(user, title, titleLink, postApiResponse.raw, context);
              slack.addTagsField(attachment, topicApiResponse, context);
              attachment.color = category.color;
              attachment.footer = `Discourse: ${discourseEvent}`;

              return slack.postSlackMessage({
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
