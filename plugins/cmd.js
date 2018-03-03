const { spawn } = require('child_process');
var exec = null;
var log = null;
var cmd = spawn('cmd', []);
module.exports = {
  init: function (execFunc, logFunc) {
    exec = execFunc;
    log = logFunc;
    exec('tellraw @a ' + JSON.stringify({text: 'DISCLAIMER: THIS PLUGIN HAS HUGE SECURITY RISK IF ON A NON-WHITELISTED SERVER', color: 'yellow'}));
    log('DISCLAIMER: THIS PLUGIN HAS HUGE SECURITY RISK IF ON A NON-WHITELISTED SERVER');
    cmd.stdout.on('data', chunk => {
      exec('tellraw @a ' + JSON.stringify({text: chunk.toString().replace(new RegExp('\r', 'g'), '')}));
    });
    cmd.stderr.on('data', chunk => {
      exec('tellraw @a ' + JSON.stringify({text: chunk.toString().replace(new RegExp('\r', 'g'), '')}));
    });
  },
  commands: {
    cmd: function (data) {
      exec('tellraw ' + data.player + ' ' + JSON.stringify({text: 'DISCLAIMER: THIS PLUGIN HAS HUGE SECURITY RISK IF ON A NON-WHITELISTED SERVER', color: 'yellow'}));
      cmd.stdin.write(data.args.join(' ').replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
    }
  },
  meta: {
    name: 'Command Prompt Sample Plugin',
    version: '1.0.0',
    description: 'Control Command Prompt In Minecraft',
    commands: {
      cmd: {
        args: ['Command'],
        description: 'Send Command To Command Prompt'
      }
    }
  },
  kill: function () {
    cmd.kill();
  }
};
