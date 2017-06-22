'use latest';

var Express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');
var map = require('lodash.map');
var pick = require('lodash.pick');

var discourse = require('./lib/discourse');
var slack = require('./lib/slack');

var server = Express();

// use express to work around 1MB payload limit
// make sure to use --no-parse when creating the webtask
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json({ limit: '50mb' }));

server.post('/', (req, res) => {

  try {

    const data = req.body;
    const context = req.webtaskContext;

    const discourseEvent = context.headers['x-discourse-event'];

    let perEventPromise;

    // only supported for topic_created
    if (discourseEvent === 'topic_created') {

      perEventPromise = discourse.getDiscourseTopic(data.topic.id, context).then((topicApiResponse) => {
        const categoryId = topicApiResponse.category_id;
        const postId = topicApiResponse.post_stream.posts[0].id;
        return discourse.getDiscoursePost(postId, context).then((postApiResponse)  => {
          const actorUsername = postApiResponse.username;
          return discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
            return discourse.getDiscourseCategory(categoryId, context).then((category) => {

              const topic = topicApiResponse;
              const user = userApiResponse.user;

              const title = `[${category.name}] ${topic.title}`;
              const topicLink = `${discourse.link(`t/${topic.slug}/${topic.id}`, context)}`;
              const tagsLink = map(topic.tags, (tag) => (`<${discourse.link(`tags/${tag}`, context)}|${tag}>`)).join(', ');

              const helpscoutSearchURL = `https://secure.helpscout.net/search/?query=${user.email}`;
              const thumbUrl = `${discourse.link(user.avatar_template.replace('{size}', '64'), context)}`;

              const callbackId = JSON.stringify({
                topic: pick(topic, ['id']),
                category: pick(category, ['id', 'name', 'slug']),
                user: pick(user, ['id', 'name', 'username', 'email'])
              });

              var attachment = {
                fallback: title,
                title: title,
                title_link: topicLink,
                color: category.color,
                callback_id: callbackId,
                author_name: `${user.name} @${user.username}`,
                author_link: discourse.link(`users/${user.username}/summary`, context),
                text: postApiResponse.raw,
                footer: 'Discourse: topic_created',
                ts: Math.floor(Date.parse(topic.created_at) / 1000),
                thumb_url: thumbUrl,
                fields: [
                  {
                    title: 'Customer',
                    value: `<${helpscoutSearchURL}|${user.email}>`,
                    short: true
                  },
                  {
                    title: 'Tags',
                    value: tagsLink,
                    short: true
                  },
                ],
                actions: [
                  {
                    'type': 'button',
                    'name': 'topic-created-options',
                    'text': 'Dismiss',
                    'value': 'dismiss'
                  }, {
                    'type': 'button',
                    'name': 'topic-created-options',
                    'text': 'Support',
                    'value': 'support'
                  }, {
                    'type': 'button',
                    'name': 'topic-created-options',
                    'text': 'Community',
                    'value': 'community'
                  }
                ]
              };

              return slack.postSlackMessage({
                attachments: [attachment]
              }, context.secrets.SEND_TO_SLACK_INTERACTIVE_WEBHOOK_URL);

            });
          });
        });
      });

    } else {

      perEventPromise = Promise.resolve();

    }

    return perEventPromise.then(() => {

      console.log('SendToSlackInteractive Success');
      res.json({ ok: true });

    }).catch((error) => {

      console.error('SendToSlackInteractive Failure', error);
      console.trace(error);
      res.status(500).send(error);

    });

  } catch (error) {
    console.error('SendToSlackInteractive Error', error);
    console.trace(error);
    res.status(500).send(error);
  }

});

module.exports = Webtask.fromExpress(server);
