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
          console.error('PostSlackMessage Success');
          resolve(body);
        }
      });
    });
  },

  getSlackAttachmentFields: function(user, context) {
    return {
      helpscoutSearchURL: `https://secure.helpscout.net/search/?query=${user.email}`,
      thumb_url: `${this.link(user.avatar_template.replace('{size}', '64'), context)}`,
    };
  },

  getSimpleSlackAttachment: function(user, title, titleLink, text, context) {
    return {
      fallback: title,
      title: title,
      title_link: titleLink,
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
  },

  addCustomerField: function (attachment, user) {
    // if you're not using helpscout, you might create a different link
    // based on the data in the Discourse user JSON
    const customerLink = `<https://secure.helpscout.net/search/?query=${user.email}|${user.email}>`;
    attachment.fields.push({
      title: 'Customer',
      value: customerLink,
      short: true
    });
  }

};
