# discourse-webhook-collector

[Discourse](https://discourse.org) has [webhooks](https://meta.discourse.org/t/setting-up-webhooks/49045), which are very helpful for connecting it to other things so you can [scale your community](https://speakerdeck.com/dzello/scaling-community-by-webhooking-the-things).

This repository contains a set of functions that catch Discourse webhooks, transform or enrich the JSON payload, and then call other downstream APIs and SaaS services. Currently included are [Slack](https://api.slack.com/), [Keen IO](https://keen.io/docs) and [HelpScout](http://developer.helpscout.net/help-desk-api/). Connecting more services would not be hard - PR's are welcome!

These webhooks are designed to run on the [webtask.io](https://webtask.io/docs/101) function-as-a-service platform from [Auth0](https://auth0.com). Webtask functions are written in JavaScript and can take advantage of packages on NPM. If you don't have previous webtask experience, I would recommend [taking a tutorial](https://auth0.com/blog/building-serverless-apps-with-webtask/) before working with this repository.

## Prerequisites

You will need admin access to running Discourse instance and [wt-cli](https://github.com/auth0/wt-cli) with an active webtask profile. Depending on which webhooks you want to use, you will need to access to projects and API keys for the various supported services.

## Getting started

The `SendToConsole` task simply logs a few Discourse-specific HTTP headers and the JSON body to the console. It's best to make sure you can run this successfully before connecting other downstream APIs.

To do that, first clone this repo:

```
git clone git@github.com:algolia/discourse-webhook-collector.git
```

Install dependencies with yarn:

```
yarn
```

Create an empty `.secrets.development` file, as you do not need to specify any API keys just to log to the console.

Deploy a function named `SendToConsoleDev` to webtask using the task shortcut in package.json.

```
yarn run dev-send-to-console
```

The shortcut is just a wrapper for this wt-cli command:

```
wt create --name SendToConsoleDev --bundle --no-parse --secrets-file .secrets.development --watch SendToConsole.js
```

`--no-parse` is used to work around limits with large event bodies, which Discourse has been known to omit. `--bundle` allows us to put code in multiple files. `--name` is the name of the webtask. It's very helpful two have two versions of each function deployed at the same time - one for live development and one for production. The development version webtask names are always suffixed with "Dev" and use `.secrets.development` instead of `.secrets.production` so you can specify different non-production downstream targets, like a Slack channel or Keen IO project that's used just for testing.

`--watch` keeps the process attached to the webtask, so you can see logs when it's invoked and so that any code changes you make are automatically uploaded (this is especially why you shouldn't use it for production).

Now that our `SendToConsoleDev` webtask has been created, let's test it with cURL. In a new shell, export a `url` variable that points to your webtask profile domain:

```
export url=https://<your-subdomain>.<region-subdomain>.webtask.io
```

Now, run a command shortcut that will send a cURL request to your new webtask:

```
yarn test-send-to-console
```

Which is just a shortcut for:

```
curl -X POST $url/SendToConsoleDev --data '@./test/DiscourseTopicEvent.json' --header 'Content-Type: application/json' --header 'x-discourse-event-type: topic' --header 'x-discourse-event: topic_created'
```

You should see this output in the log of your webtask:

```
SendToConsole - Received webhook
SendToConsole - Discourse event: topic_created
SendToConsole - Discourse event type: topic
SendToConsole - JSON payload:
{
 "topic": {
  "id": 1608
 }
}
SendToConsole Success
```

If you do, that means that your webtask setup is working properly. Hooray!

## Connecting Discourse

Now you're ready to add webhooks to your Discourse instance from the admin console. In your admin console, navigate to API, then webhooks, then click the button for "New webhook".

Let's create a webhook for our `SendToConsoleDev` webtask. The Payload URL is the key field to populate, as follows:

![Discourse create webhook UI](https://cl.ly/1b3h371R2k06/Screenshot%202017-06-11%2012.27.57.png)

Make sure to substitute the right values for your webtask domain. Choose "Send me everything" from the event types section, or select just the events that you'd like to test with. Check the "Active" checkbox and then click "Create". Click "Go to events" and then click the "Ping" button. You should see the following in your webtask log:

```
SendToConsole - Received webhook
SendToConsole - Discourse event: ping
SendToConsole - Discourse event type: ping
SendToConsole - JSON payload:
{
 "ping": "OK"
}
SendToConsole Success
```

This means that your Discourse can successfully send events to your webtasks. Depending on what event types you chose, you will start seeing output when topics, posts and user events happen.

## Connecting APIs

Just logging to the console isn't very interesting. Ideally, we want to forward this activity to some APIs.

### Prerequisite - Discourse API access

Discourse webhook JSON payloads do not always contain all of the information that we want and payloads vary greatly based on the event type. That makes it difficult to keep event schema consistent for forwarding to analytics services like Keen IO.

The solution that discourse-webhook-collector proposes is not to patch Discourse or use a plugin (at least not yet) but to use the Discourse API to fetch the missing JSON. Do this, discourse-webhook-collector needs to know the location of your Discourse instance and have an API key with admin access.

To find or generate a Discourse API key, navigate to "API" and then "API" in the submenu of your Discourse admin interface.

One you have the API key, put it and the domain in your `.secrets.development` and `.secrets.production` files, like so:

```
DISCOURSE_URL=https://discourse.<my-domain>.com
DISCOURSE_API_KEY=<my-discourse-api-key>
```

### Slack

Before beginning, create an [incoming webhook](https://api.slack.com/incoming-webhooks) using the Slack API that reflects what channel you'd like activity to go to. Copy the webhook URL and add it to the secrets files. (You may want to use different values for `.secrets.development` and `.secrets.production` if you'd like to separate your testing from live messages.)

```
SLACK_WEBHOOK_URL=<my-slack-webhook-url>
```

Next, deploy the development version of the `SendToSlack` webtask:

```
yarn run dev-send-to-slack
```

Next, add another webhook to your Discourse. Instead of pointing to the `SendToConsoleDev` path in the Payload URL field, use `SendToSlackDev` instead.

Now, perform an action on your Discourse like creating a new topic. A new message should post to the Slack channel you configured in your incoming webhook.

To deploy a production version (the only difference being that it uses the `.secrets.production` file instead), run the deploy command:

```
yarn run deploy-send-to-slack
```

After doing that, add a new webhook in your Discourse that points to `SendToSlack` in the payload URL field. You can leave the development webhook active or make it inactive, that's up to you. The main idea is to keep the production path separate so you can develop and test new webhook functionality without impacting production.

### Keen IO

The instructions are essentially the same as for Slack. These are the values you'll need to put in the secrets files:

```
KEEN_PROJECT_ID=<my-project-id>
KEEN_WRITE_API_KEY=<my-write-api-key>
```

Double-check to make sure you're using an API key that has write access.

The commands to create the development and production versions of the webtask are as follows:

```
yarn run dev-send-to-keen
yarn run deploy-send-to-keen
```

The corresponding webtask names to put in your Discourse Payload URL are `SendToKeenDev` and `SendToKeen`.

### HelpScout

These are the secrets values that are required:

```
HELPSCOUT_MAILBOX_ID=<my-mailbox-id>
HELPSCOUT_API_KEY=<my-api-key>
```

See the [HelpScout API documentation](http://developer.helpscout.net/help-desk-api/) for information on how to provision API keys and get mailbox IDs.

These are the commands to create the webtasks:

```
yarn run dev-send-to-helpscout
yarn run deploy-send-to-helpscout
```

The corresponding webtask names to put in your Discourse Payload URL are `SendToHelpScoutDev` and `SendToHelpScout`.

### Contributing

All contributions are welcome. If there is another API or service that you are using with Discourse, feel free to add it here using the current conventions and submit a PR. If you have a question, please open an issue. Thanks!
