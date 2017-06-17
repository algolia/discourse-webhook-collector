var map = require('lodash.map');
var reduce = require('lodash.reduce');
var sortBy = require('lodash.sortBy');

var keen = require('./lib/keen');
var slack = require('./lib/slack');
var discourse = require('./lib/discourse');

module.exports = (context, cb) => {

  const queryOne = keen.runKeenQuery('count', {
    event_collection: 'discourse-topic_created',
    timeframe: 'last_24_hours'
  }, context);

  const queryTwo = keen.runKeenQuery('count', {
    event_collection: 'discourse-user_created',
    timeframe: 'last_24_hours'
  }, context);

  const queryThree = keen.runKeenQuery('count', {
    event_collection: 'discourse-post_created',
    timeframe: 'last_24_hours',
    group_by: 'user.username'
  }, context);

  const queryFour = keen.runKeenQuery('extraction', {
    event_collection: 'discourse-topic_created',
    timeframe: 'last_24_hours',
    property_names: 'topic.tags'
  }, context).then((response) => {
    let tags = map(response.result, 'topic.tags');
    tags = reduce(tags, (memo, _tags) => {
      _tags.forEach((tag) => {
        if (memo[tag]) {
          memo[tag] = memo[tag] + 1;
        } else {
          memo[tag] = 1;
        }
      });
      return memo;
    }, {});
    tags = map(tags, (count, tag) => ({ ['topic.tag']: tag, result: count }));
    return tags;
  });

  const queryFive = keen.runKeenQuery('count', {
    event_collection: 'discourse-post_created',
    timeframe: 'last_24_hours'
  }, context);

  Promise.all([queryOne, queryTwo, queryThree, queryFour, queryFive]).then((responses) => {

    const title = 'Daily Community Report';

    slack.postSlackMessage({
      attachments: [{
        title: title,
        fallback: title,
        color: '#8E43E7',
        text: 'A summary of community activity from the last 24 hours.',
        fields: [{
          title: 'New Topics',
          value: responses[0].result,
          short: true
        }, {
          title: 'New Posts',
          value: responses[4].result,
          short: true
        }, {
          title: 'New Users',
          value: responses[1].result,
          short: true
        }, {
          title: '',
          value: '',
          short: true
        }, {
          title: 'Top 10 Post Authors',
          value: map(sortBy(responses[2].result, 'result').reverse().slice(0, 10), (item) => `<${discourse.link(`users/${item['user.username']}`, context)}|${item['user.username']}>: ${item['result']}`).join('\n'),
          short: true
        }, {
          title: 'Top 10 Topic Tags',
          value: map(sortBy(responses[3], 'result').reverse().slice(0, 10), (item) => `<${discourse.link(`tags/${item['topic.tag']}`, context)}|${item['topic.tag']}>: ${item['result']}`).join('\n'),
          short: true
        }]
      }]
    }, context.secrets.ACTIVITY_REPORT_SLACK_WEBHOOK_URL).then(() => {

      cb(null, { ok: true });

    }).catch((error) => {

      console.error('ActivityReport Failed', error);
      cb(error);

    });

  });

};
