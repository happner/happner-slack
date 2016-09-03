
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
        web: {
          routes: {
            command: ['__formDecode', 'command']
          }
        }
      }
    }
  }
};
