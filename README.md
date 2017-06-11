# discourse-webhook-collector

A set of webhook consumers for consuming activity from Discourse and sending to other services.

These webhook consumers are designed to be deployed to webtask.io. If you use webtask, most of what's in this repository should just work.

Currently, this repository has built-in support for sending messages to Slack and events to Keen IO.

Discourse webhooks included:

- all user events
- all topic events
- all post events

Note: This repository is not meant to do everything that you want with your Discourse webhooks. The main thing it does is provide a boilerplate that easily deploys to webtask, and knows how to call back to the API of your Discourse instance to fetch JSON that doesn't come with the webhooks but is useful to have for analytics and Slack messages.

### Prerequisites

You will need a running Discourse instance, wt-cli with an active webtask profile and a Keen IO and/or Slack account depending on what you would like to do with the webhooks.

### Usage

Clone this repo:

```
git clone git@github.com:algolia/discourse-webhook-collector.git
```

Install dependencies with yarn:

```
yarn
```

Create a `.secrets.development` file that contains the various API keys you will need.

```
KEEN_PROJECT_ID=.......
KEEN_WRITE_KEY=.......
SLACK_WEBHOOK_URL=......
DISCOURSE_URL=......
DISCOURSE_API_KEY=........
```

Keen credentials should reflect the Keen IO project where you'd like to store the data.

The `SLACK_WEBHOOK_URL` should reflect an incoming webhook for the channel that you want the messages to go into.

The `DISCOURSE_URL` should be the full URL to your Discourse, e.g. `https://discourse.my-domain.com`. A `DISCOURSE_API_KEY` can be provisioned inside of the Discourse Admin interface.

Assuming that wt-cli is installed and you can successfully create webtasks, run this to deploy a webtask that forwards Discourse activity to Slack:

```
yarn run dev-send-to-slack
```

This will deploy and watch the webtask, live-reloading it when you save changes. Here is the same, but for Keen IO:

```
yarn run dev-send-to-keen
```

### Deployment

Deployment and development are almost identical. The only difference is the use of a `.secrets.production` file for separate deploy tasks that create webtasks with different names. They are:

```
yarn run deploy-send-to-slack
```

```
yarn run deploy-send-to-keen
```

### Connecting your Discourse

Add webhooks from the Discourse admin interface that point to where your webtasks are running. If you are using both Slack and Keen IO and want development and production versions, you will have a total of 4 webhooks.

You can choose that all events be sent in the webhooks, or just a subset.

### Contributing

All contributions are welcome. If there is another downstream service that you are using with Discourse, feel free to add it here. If you have a question, please open an issue. Thanks!
