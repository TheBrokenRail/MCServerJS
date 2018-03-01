module.exports = {
  commands: {
    skull: function (player, args, exec) {
      exec('give ' + player + ' skull 1 3 {SkullOwner:"' + args[0] + '"}');
      exec('tellraw @a ' + JSON.stringify({text: 'Successfully Given ' + args[0] + '\'s Head To ' + player, color: 'green'}));
    },
    args: function (player, args, exec) {
      exec('tellraw ' + player + ' ' + JSON.stringify({text: JSON.stringify(args, null, 2), color: 'yellow'}));
    }
  },
  meta: {
    name: 'Sample Plugin',
    version: '1.0.0',
    description: 'Sample Plugin With Custom Skull and Argruments Test Commands',
    commands: {
      skull: {
        args: '<Skull Owner>',
        description: 'Give The Caller A Skull With The Set Skull Owner'
      },
      args: {
        args: '<Argruments>',
        description: 'Prints A JSON Array Of All Argruments'
      }
    }
  }
};
