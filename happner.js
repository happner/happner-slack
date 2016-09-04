
var tokens = [];
if (process.env.SLACK_COMMAND_TOKENS) {
  tokens = process.env.SLACK_COMMAND_TOKENS.split(',').map(function(token) {
    return token.trim();
  });
}

module.exports.configs = {
  'default-config': {
    component: {
      name: 'happner-slack',
      config: {
        startMethod: 'start',
        command: {
          tokens: tokens
        },
        webhook: {
          url: process.env.SLACK_WEBHOOK_URL
        },
        web: {
          routes: {
            command: ['__formDecode', '__command']
          }
        }
      }
    }
  }
};
