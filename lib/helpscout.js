'use latest';

var request = require('request');

module.exports = {

  toFormattedMessage: (html, link) => {
    var body = '';
    body += html;
    body += '-----------------------------------------------------------<br>';
    body += '<h3 style="color: #FF4F81;">';
    body += '👉  PLEASE ANSWER ON DISCOURSE THEN CLOSE THIS TICKET  👈';
    body += '</h3>';
    body += `<a href='${link}'>${link}</a>`;
    body += '<br/>';
    body += '-----------------------------------------------------------';
    return body;
  },

  createHelpscoutConversation: ({ email, subject, body, tags, mailbox }, context) => {
    return new Promise((resolve, reject) => {
      request.post({
        auth: { user: context.secrets.HELPSCOUT_API_KEY, pass: 'X' },
        url: 'https://api.helpscout.net/v1/conversations.json',
        json: true,
        body: {
          type: 'email',
          customer: {
            email: email
          },
          subject: subject,
          tags: tags,
          mailbox: {
            id: mailbox
          },
          status: 'active',
          threads: [{
            type: 'customer',
            createdBy: {
              email: email,
              type: 'customer'
            },
            body: body,
            status: 'active'
          }]
        }
      }, (error, res, body) => {
        if (error) {
          console.error('CreateHelpScoutConversation Error', error);
          console.trace(error);
          reject(error);
        } else if (res.statusCode > 299) {
          console.error('CreateHelpScoutConversation Error');
          reject(res.body);
        } else {
          console.log('CreateHelpScoutConversation Success');
          resolve(body);
        }
      });
    });
  }

};
