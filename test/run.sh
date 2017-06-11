# export a $url variable in your shell containing your *.*.webtask.io domain

echo 'user - slack'
curl -X POST $url/SendToSlackDev --data '@./test/DiscourseUserEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: user' --header 'x-discourse-event: user_created'
echo ''
echo 'topic - slack'
curl -X POST $url/SendToSlackDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'
echo ''
echo 'post - slack'
curl -X POST $url/SendToSlackDev --data '@./test/DiscoursePostEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: post' --header 'x-discourse-event: post_created'

echo ''
echo 'user - keen'
curl -X POST $url/SendToKeenDev --data '@./test/DiscourseUserEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: user' --header 'x-discourse-event: user_created'
echo ''
echo 'topic - keen'
curl -X POST $url/SendToKeenDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'
echo ''
echo 'post - keen'
curl -X POST $url/SendToKeenDev --data '@./test/DiscoursePostEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: post' --header 'x-discourse-event: post_created'

echo ''
echo 'topic - helpscout'
curl -X POST $url/SendToHelpScoutDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'
