module.exports.configs = {
  'default-config': {
    component: {
      name: 'happner-slack',
      config: {
        startMethod: 'start',
        command: {
          token: process.env.SLACK_COMMAND_TOKEN
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
