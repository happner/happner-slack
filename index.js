module.exports = HappnerSlack;

var bodyParser = require('body-parser');
var request = require('request');

function HappnerSlack() {
}

HappnerSlack.prototype.start = function ($happn, callback) {
  callback();
};

HappnerSlack.prototype.command = function ($happn, req, res) {
  $happn.log.info('command: %s', req.url);

  /*
   req.body = {
   "token": "...",
   "team_id": "...",
   "team_domain": "...",
   "channel_id": "...",
   "channel_name": "...",
   "user_id": "...",
   "user_name": "...",
   "command": "/do",
   "text": "xx yy",
   "response_url": "https://hooks.slack.com/commands/.../.../..."
   };
   */

  if (!$happn.config.command || !$happn.config.command.tokens) {
    $happn.log.warn('missing config.command.tokens');
    res.statusCode = 500;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 400;
    return res.end();
  }

  if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
    res.statusCode = 400;
    return res.end();
  }

  if (!req.body.token) {
    res.statusCode = 403;
    return res.end();
  }

  if ($happn.config.command.tokens.indexOf(req.body.token) < 0) {
    $happn.log.warn('bad token from slack for url: %s', req.url);
    res.statusCode = 403;
    return res.end();
  }

  var parts = req.url.split('/');
  var component = parts[1];
  var method = parts[2];

  if (
    !$happn.exchange.hasOwnProperty(component) ||
    !$happn.exchange[component].hasOwnProperty(method) ||
    typeof $happn.exchange[component][method] !== 'function'
  ) {
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({
      response_type: 'ephemeral',
      text: 'Error: Missing ' + component + '/' + method + ' (component/method)',
    }));
  }

  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({
    response_type: 'ephemeral',
    text: 'Running: ' + req.body.command + ' ' + req.body.text
  }));

  var responseUrl = req.body.response_url;
  delete req.body.response_url;

  $happn.exchange[component][method](req.body)

    .then(function(result) {
      request.post({
        url: responseUrl,
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(result)
      }, function(err, res) {
        if (err) {
          return $happn.log.warn('failed post to %s', responseUrl, err);
        }
        if (res.statusCode !== 200) {
          return $happn.log.warn('failed status %s from %s', res.statusCode, responseUrl);
        }
      });
    })

    .catch(function(error) {
      request.post({
        url: responseUrl,
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          text: error.toString()
        })
      }, function(err, res) {
        if (err) {
          return $happn.log.warn('failed post to %s', responseUrl, err);
        }
        if (res.statusCode !== 200) {
          return $happn.log.warn('failed status %s from %s', res.statusCode, responseUrl);
        }
      });
    });

  res.statusCode = 200;
  res.end();
};

HappnerSlack.prototype.__formDecode = bodyParser.urlencoded({extended: true});
