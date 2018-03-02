const { spawn } = require('child_process');
var exec = null;
var cmd = spawn('cmd', []);
module.exports = {
  init: function (execFunc) {
    exec = execFunc;
    cmd.stdout.on('data', chunk => {
      exec('tellraw @a ' + JSON.stringify({text: chunk.toString().replace(new RegExp('\r', 'g'), '')}));
    });
    cmd.stderr.on('data', chunk => {
      exec('tellraw @a ' + JSON.stringify({text: chunk.toString().replace(new RegExp('\r', 'g'), '')}));
    });
  },
  commands: {
    cmd: function (data) {
      cmd.stdin.write(data.args.join(' ').replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
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
