const commands = {
  skull: function (player, args, exec) {
    exec('give ' + player + ' skull 1 3 {SkullOwner:"' + args[0] + '"}');
    exec('tellraw @a ' + JSON.stringify({text: 'Successfully Given ' + args[0] + '\'s Head To ' + player, color: 'green'}));
  },
  args: function (player, args, exec) {
    exec('tellraw ' + player + ' ' + JSON.stringify({text: JSON.stringify(args, null, 2), color: 'yellow'}));
  }
};

module.exports = {
  listener: function (str, stdin) {
    for (x in commands) {
      var cmdArr = str.split('<');
      if (cmdArr.length > 1) {
        var player = cmdArr[1].split('>')[0];
        var cmd = cmdArr[1].split('>')[1];
        if (cmd.startsWith(' ' + x)) {
          var args = cmd.split(' ' + x)[1].trim().split(' ');
          try {
            commands[x](player, args, function (cmd) {
              stdin.write(cmd.replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
            });
          } catch(e) {
            stdin.write('tellraw ' + player + ' ' + JSON.stringify({text: e.toString(), color: 'red'}).replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
          }
        }
      }
    }
  }
};