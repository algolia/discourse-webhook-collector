'use latest';

var discourse = require('./lib/discourse');
var helpscout = require('./lib/helpscout');
var keen = require('./lib/keen');

module.exports = (context, cb) => {

  // these are the two helpscout mailboxes that map to the two buttons
  // you may have a different system and can adapt this code accordingly
  const COMMUNITY_MAILBOX = JSON.parse(context.secrets.COMMUNITY_MAILBOX);
  const SUPPORT_MAILBOX = JSON.parse(context.secrets.SUPPORT_MAILBOX);

  const payload = JSON.parse(context.data.payload);
  const callbackPayload = JSON.parse(payload.callback_id);

  const slackUsername = payload.user.name;
  const action = payload.actions[0];

  if (action.name !== 'topic-created-options') {
    cb({ error: 'Unknown action!'});
    return;
  }

  const shouldDispatch = action.value !== 'dismiss';

  const attachment = Object.assign({}, payload.original_message.attachments[0]);
  delete attachment['footer_icon'];
  delete attachment['actions'];
  const response = {
    attachments: [attachment]
  };

  var topic;

  return discourse.getDiscourseTopic(callbackPayload.topic.id, context).then((topicApiResponse) => {
    topic = topicApiResponse;
    const postId = topicApiResponse.post_stream.posts[0].id;
    return discourse.getDiscoursePost(postId, context).then((postApiResponse) => {
      return shouldDispatch
        ? (() => {

          const mailbox = action.value === 'community' ? COMMUNITY_MAILBOX : SUPPORT_MAILBOX;
          const mailboxLink = `https://secure.helpscout.net/mailbox/${mailbox.slug}`;
          attachment.footer = `Dispatched to <${mailboxLink}|${mailbox.name}> mailbox by <@${slackUsername}>`;

          var body = helpscout.toFormattedMessage(postApiResponse.cooked, attachment.title_link);
          return helpscout.createHelpscoutConversation({
            mailbox: mailbox.id,
            email: callbackPayload.user.email,
            subject: topic.title,
            body: body,
            tags: ['discourse'].concat(topic.tags).concat(callbackPayload.category.slug ? callbackPayload.category.slug : [])
          }, context);

        })()
        : new Promise((resolve) => {
          attachment.footer = `Dismissed by <@${slackUsername}>`;
          resolve();
        });
    });
  }).then(() => {

    return keen.recordKeenEvent('slack_button_clicked', {
      action: action,
      team: payload.team,
      channel: payload.channel,
      user: payload.user,
      context: {
        user: callbackPayload.user,
        topic: keen.topicForEvent(topic),
        category: callbackPayload.category
      }
    }, context);

  }).then(() => {

    console.log('ReceiveSlackInteraction Dispatch Success');
    cb(null, response);

  }).catch((error) => {

    console.log('ReceiveSlackInteraction Dispatch Failed', error);
    console.trace(error);
    cb(error);

  });

};
