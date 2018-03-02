var exec = null;
module.exports = {
  init: function (execFunc) {
    exec = execFunc;
  },
  commands: {
    skull: function (data) {
      exec('give ' + data.player + ' skull 1 3 {SkullOwner:"' + data.args[0] + '"}');
      exec('tellraw @a ' + JSON.stringify({text: 'Successfully Given ' + data.args[0] + '\'s Head To ' + data.player, color: 'green'}));
    },
    args: function (data) {
      exec('tellraw ' + data.player + ' ' + JSON.stringify({text: JSON.stringify(data.args, null, 2), color: 'yellow'}));
    }
  },
  meta: {
    name: 'Sample Plugin',
    version: '1.0.0',
    description: 'Sample Plugin With Custom Skull and Argruments Test Commands',
    commands: {
      skull: {
        args: ['Skull Owner'],
        description: 'Give The Caller A Skull With The Set Skull Owner'
      },
      args: {
        args: ['Argruments'],
        description: 'Prints A JSON Array Of All Argruments'
      }
    }
  }
};
