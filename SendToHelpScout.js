'use latest';

var Express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');

var discourse = require('./lib/discourse');
var helpscout = require('./lib/helpscout');

var server = Express();

// use express to work around 1MB payload limit
// make sure to use --no-parse when creating the webtask
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());

server.post('/', (req, res) => {

  try {

    const data = req.body;
    const context = req.webtaskContext;

    const discourseEvent = context.headers['x-discourse-event'];

    let perEventPromise;

    // just implemented for topic_created right now
    if (discourseEvent === 'topic_created') {

      perEventPromise = discourse.getDiscourseTopic(data.topic.id, context).then((topicApiResponse) => {
        const actorUsername = topicApiResponse.details.created_by.username;
        return discourse.getDiscourseUser(actorUsername, context).then((userApiResponse) => {
          const postId = topicApiResponse.post_stream.posts[0].id;
          const categoryId = topicApiResponse.category_id;
          return discourse.getDiscoursePost(postId, context).then((postApiResponse) => {
            return discourse.getDiscourseCategory(categoryId, context).then((category) => {

              const topicLink = `${discourse.link(`t/${topicApiResponse.slug}/${topicApiResponse.id}`, context)}`;

              var body = '';
              body += postApiResponse.raw + '\n\n';
              body += `<a href='${topicLink}'>${topicLink}</a>`;

              return helpscout.createHelpscoutConversation({
                mailbox: context.secrets.HELPSCOUT_MAILBOX_ID,
                email: userApiResponse.user.email,
                subject: topicApiResponse.title,
                body: body,
                tags: ['discourse', category.slug].concat(topicApiResponse.tags)
              }, context);

            });
          });
        });
      });

    } else {

      perEventPromise = Promise.resolve();

    }

    return perEventPromise.then(() => {

      console.log('SendToHelpScout Success');
      res.json({ ok: true });

    }).catch((error) => {

      console.error('SendToHelpScout Failure', error);
      console.trace(error);
      res.status(500).send(error);

    });

  } catch (error) {
    console.error('SendToHelpScout Error', error);
    console.trace(error);
    res.status(500).send(error);
  }

});

module.exports = Webtask.fromExpress(server);
