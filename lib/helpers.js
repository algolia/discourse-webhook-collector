'use latest';

var pick = require('lodash.pick');
var find = require('lodash.find');
var map = require('lodash.map');
var request = require('request');

var KeenTracking = require('keen-tracking');

module.exports = {

  link: (path, context) => (`${context.secrets.DISCOURSE_URL}/${path}`),

  getDiscourseJSON: (resource, discourseApiUsername, context) => {
    var url = `${context.secrets.DISCOURSE_URL}/${resource}.json?api_username=${discourseApiUsername}&api_key=${context.secrets.DISCOURSE_API_KEY}`;
    return new Promise((resolve, reject) => {
      request({
        method: 'GET', url, json: true
      }, function(error, res, body) {
        if (error || body.errors) {
          console.error('DiscourseEvent DiscourseAPI Error', error || body.errors);
          reject(error || body.errors);
        } else {
          resolve(body);
        }
      });
    });
  },

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

  recordKeenEvent: (eventCollection, eventBody, context) => {
    const keenProjectId = context.secrets.KEEN_PROJECT_ID;
    const keenWriteKey = context.secrets.KEEN_WRITE_KEY;
    var keenClient = new KeenTracking({
      projectId: keenProjectId, writeKey: keenWriteKey
    });
    return new Promise((resolve, reject) => {
      if (!eventBody.keen)
        eventBody.keen = {};
      Object.assign(eventBody.keen, {
        addons: [{
          name: 'keen:date_time_parser',
          input: {
            date_time: 'keen.timestamp',
          },
          'output': 'timestamp_info'
        }]
      });
      keenClient.recordEvent(eventCollection, eventBody, function(error, res) {
        if (error) {
          console.error('DiscourseEvent KeenAPI Error', error);
          reject(error);
        } else {
          console.error('DiscourseEvent KeenAPI Success');
          resolve(res);
        }
      });
    });
  },

  getDiscourseUser: function(username, context) {
    return this.getDiscourseJSON(`users/${username}`, username, context);
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
  },

  userForEvent: (apiResponse) => {
    let user = apiResponse.user;
    return Object.assign(
      pick(user, [
        'id', 'name', 'email', 'avatar_template', 'username', 'created_at',
        'updated_at', 'last_seen_at', 'last_posted_at', 'website', 'website_name',
        'bio_raw', 'location', 'trust_level', 'moderator', 'admin', 'title',
        'badge_count', 'post_count', 'profile_view_count', 'card_image_badge',
        'card_image_badge_id', 'featured_user_badge_ids'
      ]), {
        badge_ids: map(apiResponse.badges, 'id'),
        badge_names: map(apiResponse.badges, 'name'),
        badge_descriptions: map(apiResponse.badges, 'description'),
        badge_icons: map(apiResponse.badges, 'icon'),
        badge_images: map(apiResponse.badges, 'image'),
        badge_grant_counts: map(apiResponse.badges, 'grant_count'),
        badge_badge_type_ids: map(apiResponse.badges, 'badge_type_id'),
        badge_badge_grouping_ids: map(apiResponse.badges, 'badge_grouping_id'),
        group_ids: map(user.groups, 'id')
      }
    );
  },

  topicForEvent: (topic) => {
    return Object.assign(
      pick(topic, [
        'id', 'title', 'fancy_title', 'posts_count', 'created_at',
        'views', 'reply_count', 'participant_count', 'like_count', 'last_posted_at',
        'visible', 'closed', 'archived', 'has_summary', 'archetype',
        'slug', 'category_id', 'word_count', 'deleted_at', 'user_id',
        'pinned_globally', 'pinned', 'created_by', 'last_poster', 'highest_post_number',
        'deleted_by', 'has_deleted', 'tags', 'accepted_answer'
      ]), {
        post_ids: (typeof topic.post_stream === 'object') ? map(topic.post_stream.posts, 'id') : undefined,
        participant_ids: map(topic.details.participants, 'id'),
        participant_usernames: map(topic.details.participants, 'username'),
        participant_avatar_templates: map(topic.details.participants, 'avatar_template')
      }
    );
  },

  postForEvent: (post) => {
    return pick(post, [
      'id', 'name', 'username', 'avatar_template', 'created_at',
      'cooked', 'raw', 'post_number', 'post_type', 'updated_at', 'avg_time',
      'reply_count', 'reads', 'score', 'topic_id', 'topic_slug',
      'version', 'user_id', 'deleted_at', 'moderator', 'admin',
      'accepted_answer', 'hidden', 'wiki', 'user_deleted', 'trust_level'
    ]);
  },

  categoryForEvent: (category) => {
    return pick(category, [
      'id', 'name', 'color', 'text_color', 'slug',
      'topic_count', 'post_count', 'position', 'description',
      'description_text', 'topic_url', 'topics_day', 'topics_week',
      'topics_month', 'topics_year', 'topics_all_time', 'read_restricted'
    ]);
  },

  getSimpleSlackAttachment: function(user, title, titleLink, text, context) {
    return {
      fallback: title,
      title: title,
      titleLink: titleLink,
      text: text,
      author_name: `${user.name} @${user.username}`,
      author_link: this.link(`users/${user.username}/summary`, context),
      thumb_url: `${this.link(user.avatar_template.replace('{size}', '64'), context)}`,
      ts: new Date().getTime() / 1000,
      fields: []
    };
  },

  addTagsField: function (attachment, topic, context) {
    const tagsLink = map(topic.tags, (tag) => (`<${this.link(`tags/${tag}`, context)}|${tag}>`)).join(', ');
    attachment.fields.push({
      title: 'Tags',
      value: tagsLink,
      short: true
    });
  }

};
