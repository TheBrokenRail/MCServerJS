var exec = null;
var log = null;
module.exports = {
  init: function (execFunc, logFunc) {
    exec = execFunc;
    log = logFunc;
  },
  commands: {
    skull: (data) => {
      exec('give ' + data.player + ' skull 1 3 {SkullOwner:"' + data.args[0].replace(new RegExp('"', 'g'), '\\"') + '"}');
      exec('tellraw @a ' + JSON.stringify({text: 'Successfully Given ' + data.args[0] + '\'s Head To ' + data.player, color: 'green'}));
    },
    args: (data) => {
      exec('tellraw ' + data.player + ' ' + JSON.stringify({text: JSON.stringify(data.args, null, 2), color: 'yellow'}));
    },
    getCords: (data) => {
      exec('tp ' + data.player + ' ~ ~ ~', (str) => {
        exec('tellraw ' + data.player + ' ' + JSON.stringify({text: str}));
      });
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
      },
      getCords: {
        args: [],
        description: 'Returns Player Cordinates'
      }
    }
  }
};
