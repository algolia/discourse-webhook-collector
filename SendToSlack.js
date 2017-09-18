'use latest';

var Express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');

var discourse = require('./lib/discourse');
var slack = require('./lib/slack');
var find = require('lodash.find');

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

    let skipped = false;
    let perEventPromise;

    function filterUserOut(user) {
      // if you set DISCOURSE_FILTER_GROUP_ID in your secrets, only
      // activity from that group will be sent to the slack channel
      let discourseGroupFilter = context.secrets.DISCOURSE_FILTER_GROUP_ID;
      return discourseGroupFilter &&
        typeof find(user.groups, { id: parseInt(discourseGroupFilter) }) !== 'object';
    }

    if (discourseEventType === 'user') {
      const actorUsername = data.user.username;
      perEventPromise = discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {

        if (filterUserOut(userApiResponse.user)) {
          skipped = true;
          return;
        }

        const user = userApiResponse.user;
        const title = '';

        const attachment = slack.getSimpleSlackAttachment(user, title, '', '', context);
        attachment.color = '#3369E7';
        attachment.footer = `Discourse: ${discourseEvent}`;
        slack.addCustomerField(attachment, user);

        return slack.postSlackMessage({
          attachments: [attachment]
        }, context.secrets.SEND_TO_SLACK_WEBHOOK_URL);

      });
    }

    if (discourseEventType === 'topic') {
      perEventPromise = discourse.getDiscourseTopic(data.topic.id, context).then((topicApiResponse) => {
        const actorUsername = topicApiResponse.details.created_by.username;
        const categoryId = topicApiResponse.category_id;
        return discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
          return discourse.getDiscourseCategory(categoryId, context).then((category) => {

            // don't send private messages to slack
            if (topicApiResponse.archetype === 'private_message') {
              skipped = true;
              return;
            }

            if (filterUserOut(userApiResponse.user)) {
              skipped = true;
              return;
            }

            const topic = topicApiResponse;
            const user = userApiResponse.user;

            const title = category ? `[${category.name}] ${topic.title}` : topic.title;
            const titleLink = discourse.link(`t/${topic.slug}/${topic.id}`, context);

            const attachment = slack.getSimpleSlackAttachment(user, title, titleLink, '', context);
            slack.addCustomerField(attachment, user);
            slack.addTagsField(attachment, topic, context);
            attachment.color = category ? category.color : '';
            attachment.footer = `Discourse: ${discourseEvent}`;

            return slack.postSlackMessage({
              attachments: [attachment]
            }, context.secrets.SEND_TO_SLACK_WEBHOOK_URL);

          });
        });
      });
    }

    if (discourseEventType === 'post') {
      perEventPromise = discourse.getDiscoursePost(data.post.id, context).then((postApiResponse) => {
        return discourse.getDiscourseTopic(postApiResponse.topic_id, context).then((topicApiResponse) => {
          const categoryId = topicApiResponse.category_id;
          const actorUsername = postApiResponse.username;
          return discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
            return discourse.getDiscourseCategory(categoryId, context).then((category) => {

              // don't send private messages or system posts to slack
              if (topicApiResponse.archetype === 'private_message' || postApiResponse.username === 'system') {
                skipped = true;
                return;
              }

              if (filterUserOut(userApiResponse.user)) {
                skipped = true;
                return;
              }

              const topic = topicApiResponse;
              const user = userApiResponse.user;

              const title = category ? `[${category.name}] ${topic.title}` : topic.title;
              const titleLink = discourse.link(`t/${topic.slug}/${topic.id}/${postApiResponse.post_number}`, context);

              const attachment = slack.getSimpleSlackAttachment(user, title, titleLink, postApiResponse.raw, context);
              slack.addCustomerField(attachment, user);
              slack.addTagsField(attachment, topicApiResponse, context);
              attachment.color = category ? category.color : '';
              attachment.footer = `Discourse: ${discourseEvent}`;

              return slack.postSlackMessage({
                attachments: [attachment]
              }, context.secrets.SEND_TO_SLACK_WEBHOOK_URL);

            });
          });
        });
      });
    }

    return perEventPromise.then(() => {

      console.log(skipped ? 'SendToSlack Skipped' : 'SendToSlack Success');
      res.json({ ok: true, skipped });

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
