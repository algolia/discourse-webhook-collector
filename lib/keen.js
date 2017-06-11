'use latest';

var pick = require('lodash.pick');
var map = require('lodash.map');

var KeenTracking = require('keen-tracking');

module.exports = {

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
  }

};
