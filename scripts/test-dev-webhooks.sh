# export a $WEBTASK_URL variable in your shell containing your *.*.webtask.io domain

echo 'topic - console'
curl -X POST $WEBTASK_URL/SendToConsoleDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'

echo ''
echo 'user - slack'
curl -X POST $WEBTASK_URL/SendToSlackDev --data '@./test/DiscourseUserEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: user' --header 'x-discourse-event: user_created'
echo ''
echo 'topic - slack'
curl -X POST $WEBTASK_URL/SendToSlackDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'
echo ''
echo 'post - slack'
curl -X POST $WEBTASK_URL/SendToSlackDev --data '@./test/DiscoursePostEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: post' --header 'x-discourse-event: post_created'

echo ''
echo 'topic_created - slack-interactive'
curl -X POST $WEBTASK_URL/SendToSlackInteractiveDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'
echo ''

echo ''
echo 'dismiss button - receive-slack'
curl -X POST $WEBTASK_URL/ReceiveSlackInteractionDev --data '@./test/SlackInteractionDismiss.json'
echo ''

echo ''
echo 'community button - receive-slack'
curl -X POST $WEBTASK_URL/ReceiveSlackInteractionDev --data '@./test/SlackInteractionCommunity.json'
echo ''

echo ''
echo 'user - keen'
curl -X POST $WEBTASK_URL/SendToKeenDev --data '@./test/DiscourseUserEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: user' --header 'x-discourse-event: user_created'
echo ''
echo 'topic - keen'
curl -X POST $WEBTASK_URL/SendToKeenDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'
echo ''
echo 'post - keen'
curl -X POST $WEBTASK_URL/SendToKeenDev --data '@./test/DiscoursePostEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: post' --header 'x-discourse-event: post_created'

# comment in if you're using these webhooks
# echo ''
# echo 'cron - activity report'
# curl -X POST $WEBTASK_URL/SendKeenReportToSlackDev --header 'Content-Type: application/json'
# echo ''

# echo ''
# echo 'topic_created - helpscout'
# curl -X POST $WEBTASK_URL/SendToHelpScoutDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'
