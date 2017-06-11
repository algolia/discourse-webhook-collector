'use latest';

var map = require('lodash.map');
var request = require('request');

var discourse = require('./discourse');

module.exports = {

  postSlackMessage: (body, slackWebhookUrl) => {
    return new Promise((resolve, reject) => {
      request({
        method: 'POST',
        url: slackWebhookUrl,
        json: true,
        body: body,
      }, function(error, res, body) {
        if (error) {
          console.error('PostSlackMessage Error', error);
          console.trace(error);
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  },

  getSimpleSlackAttachment: function(user, title, titleLink, text, context) {
    return {
      fallback: title,
      title: title,
      titleLink: titleLink,
      text: text,
      author_name: `${user.name} @${user.username}`,
      author_link: discourse.link(`users/${user.username}/summary`, context),
      thumb_url: `${discourse.link(user.avatar_template.replace('{size}', '64'), context)}`,
      ts: new Date().getTime() / 1000,
      fields: []
    };
  },

  addTagsField: function (attachment, topic, context) {
    const tagsLink = map(topic.tags, (tag) => (`<${discourse.link(`tags/${tag}`, context)}|${tag}>`)).join(', ');
    attachment.fields.push({
      title: 'Tags',
      value: tagsLink,
      short: true
    });
  }

};
