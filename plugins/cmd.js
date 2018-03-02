const { spawn } = require('child_process');
var exec = null;
module.exports = {
  init: function (execFunc) {
    exec = execFunc;
  },
  commands: {
    cmd: function (data) {
      exec('give ' + data.player + ' skull 1 3 {SkullOwner:"' + data.args[0] + '"}');
      exec('tellraw @a ' + JSON.stringify({text: 'Successfully Given ' + data.args[0] + '\'s Head To ' + data.player, color: 'green'}));
    }
  },
  meta: {
    name: 'CMD',
    version: '1.0.0',
    description: 'Command Prompt In NodeJS',
    commands: {
      cmd: {
        args: ['Command'],
        description: 'Send Command To Command Prompt'
      }
    }
  }
};
