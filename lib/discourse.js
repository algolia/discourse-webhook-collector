'use latest';

var find = require('lodash.find');
var request = require('request');

module.exports = {

  link: (path, context) => (`${context.secrets.DISCOURSE_URL}/${path}`),

  getDiscourseJSON: (resource, discourseApiUsername, context) => {
    var url = `${context.secrets.DISCOURSE_URL}/${resource}.json?api_username=${discourseApiUsername}&api_key=${context.secrets.DISCOURSE_API_KEY}`;
    return new Promise((resolve, reject) => {
      request({
        method: 'GET', url, json: true
      }, function(error, res, body) {
        if (error || body.errors) {
          console.error('DiscourseAPI Error', error || body.errors);
          reject(error || body.errors);
        } else {
          resolve(body);
        }
      });
    });
  },

  getDiscourseUser: function(username, context) {
    return this.getDiscourseJSON(`users/${username}`, username, context);
  },

  // calling with api_username set to the username in question returns
  // fields like their email that you don't get with calling as "system"
  // but to get some things, groups they are in that are not shown to them,
  // you need to call as system
  getDiscourseUserWithAllGroups: function(username, context) {
    return this.getDiscourseJSON(`users/${username}`, 'system', context).then((userBySystem) => {
      return this.getDiscourseJSON(`users/${username}`, username, context).then((userByUsername) => {
        // copy the groups over from system
        userByUsername.user.groups = userBySystem.user.groups;
        return userByUsername;
      });
    });
  },

  getDiscourseTopic: function(topic_id, context) {
    return this.getDiscourseJSON(`t/${topic_id}`, 'system', context);
  },

  getDiscoursePost: function(post_id, context) {
    return this.getDiscourseJSON(`posts/${post_id}`, 'system', context);
  },

  getDiscourseCategory: function(categoryId, context) {
    return this.getDiscourseJSON('categories', 'system', context).then((body) => {
      var categories = body.category_list.categories;
      return find(categories, { id: categoryId });
    });
  }

};
