const fs = require('fs-extra');
const rimraf = require('rimraf');
const request = require('sync-request');
const {
  spawn
} = require('child_process');
const express = require('express');
const session = require('express-session');
const LevelStore = require('express-session-level')(session);
const db = require('level')('./sessions');
const app = express();

if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}
if (process.argv.indexOf('--headless') === -1) {
  app.use(express.json());
  app.use(express.urlencoded({
    extended: true
  }));
  app.use(session({
    name: 'node-js-server-cookie',
    secret: 'NodeJs Minecraft Server',
    saveUninitialized: true,
    resave: true,
    store: new LevelStore(db)
  }));
  app.use((req, res, next) => {
    if (config.users.length < 1) {
      req.session.loggedIn = true;
    }
    if (!req.session.loggedIn && req.originalUrl !== '/login') {
      if (req.originalUrl !== '/log') {
        res.redirect('/login');
      } else {
        res.send('Please Reload Page To Log In');
      }
    } else {
      next();
    }
  });
}
const defaultConfig = {
  version: 'latest-release',
  port: 25565,
  seed: '',
  pvp: false,
  difficulty: 1,
  enableCommandBlocks: false,
  gamemode: 0,
  maxPlayers: 20,
  motd: 'A Minecraft Server',
  ram: 1,
  users: [
    ['admin', 'password']
  ],
  saveServerData: true,
  pluginsEnabled: true
};
var config = null;

function load() {
  config = null;
  if (fs.existsSync('data/config.json')) {
    config = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
  }
  if (!config) {
    config = defaultConfig;
    save();
  }
}

function save() {
  fs.writeFileSync('data/config.json', JSON.stringify(config));
}
load();

function serverProperties() {
  return `level-name=../worldDir/world
server-port=${config.port}
level-seed=${config.seed}
pvp=${config.pvp}
difficulty=${config.difficulty}
gamemode=${config.gamemode}
max-players=${config.maxPlayers}
motd=${config.motd}`;
}
var pluginsEnabled = config.pluginsEnabled;

function build() {
  pluginsEnabled = config.pluginsEnabled;
  rimraf.sync('data/server');
  fs.mkdirSync('data/server');
  if (!config.version.startsWith('custom?')) {
    var versionsRes = request('GET', 'https://launchermeta.mojang.com/mc/game/version_manifest.json');
    var versionsJson = JSON.parse(versionsRes.getBody());
    var version = config.version;
    if (version === 'latest-release') {
      version = versionsJson.latest.release;
    }
    if (version === 'latest-snapshot') {
      version = versionsJson.latest.snapshot;
    }
    var url = '';
    var pluginMinimum = null;
    for (i = 0; i < versionsJson.versions.length; i++) {
      if ('1.7.2' === versionsJson.versions[i].id) {
        pluginMinimum = new Date(versionsJson.versions[i].releaseTime);
      }
    }
    for (i = 0; i < versionsJson.versions.length; i++) {
      if (version === versionsJson.versions[i].id) {
        url = versionsJson.versions[i].url;
        if (new Date(versionsJson.versions[i].releaseTime) < pluginMinimum) {
          pluginsEnabled = false;
          if (config.pluginsEnabled) {
            log = log + 'Disabling Plugins Due To Old Version Of Minecraft (<1.7.2)\n';
            console.log('Disabling Plugins Due To Old Version Of Minecraft (<1.7.2)');
          }
        }
      }
    }
    var jarRes = request('GET', url);
    var versionJson = JSON.parse(jarRes.getBody());
    if (!versionJson.downloads.hasOwnProperty('data/server')) {
      log = log + 'Version Does Not have A Server Download, Please Select Another Version\n';
      return false;
    }
    var jar = request('GET', versionJson.downloads.server.url);
    fs.writeFileSync('data/server/server.jar', jar.getBody());
  } else {
    if (fs.existsSync('jars/manifest.json')) {
      var customVersions = require('jars/manifest');
      for (x in customVersions) {
        if ('custom?' + customVersions[x] === config.version && fs.existsSync('jars/' + customVersions[x])) {
          fs.copyFileSync('jars/' + customVersions[x], 'data/server/server.jar');
          if (fs.existsSync('jars/' + customVersions[x].substring(0, customVersions[x].lastIndexOf('.')) + '/')) {
            fs.copySync('jars/' + customVersions[x].substring(0, customVersions[x].lastIndexOf('.')) + '/', 'data/server/');
          }
        } else if ('custom?' + customVersions[x] === config.version) {
          log = log + 'Custom Version Not Found, Please Select Another Version\n';
          return false;
        }
      }
    }
  }
  if (fs.existsSync('data/default')) {
    fs.copySync('data/default/', 'data/server/');
  }
  if (!fs.existsSync('data/worldDir')) {
    fs.mkdirSync('data/worldDir');
  }
  fs.writeFileSync('data/server/eula.txt', 'eula=true');
  fs.writeFileSync('data/server/server.properties', serverProperties());
  return true;
}
var server = null;
var log = '';
var commands = {};
var plugins = [];
var killPlugin = [];

function loadPlugins(playerOutput) {
  commands = {};
  for (i = 0; i < killPlugin.length; i++) {
    killPlugin[i]();
    delete killPlugin[i];
    killPlugin.splice(i, 1);
  }
  plugins = [{
    name: 'data/serverJS Built-In',
    version: '1.0.0',
    description: 'Contains Built In ServerJS Command',
    commands: {
      serverjs: {
        args: ['version|plugins|help'],
        description: 'Built-In ServerJS Command'
      }
    }
  }];
  if (!fs.existsSync('plugins')) {
    fs.mkdirSync('plugins');
  }
  var files = fs.readdirSync('plugins');
  const exec = (cmd, callback) => {
    if (server && server.stdout && server.stdin) {
      server.stdin.write(cmd.replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
      if (callback) {
        var str = '';
        var listener = chunk => {
          var strChunk = chunk.toString().replace(new RegExp('\r', 'g'), '').split('\n');
          for (i = 0; i < strChunk.length; i++) {
            if (strChunk[i].split(']: ').length > 1) {
              strChunk[i] = strChunk[i].split(']: ').slice(1).join(']: ');
            }
          }
          str = str + strChunk.join('\n');
        };
        server.stdout.on('data', listener);
        setTimeout(() => {
          callback(str);
          server.stdout.removeListener('data', listener);
        }, 25);
      }
    }
  };
  for (i = 0; i < files.length; i++) {
    var plugin = null;
    var failed = false;
    var pluginName = files[i];

    var fail = message => {
      failed = true;
      if (message !== 'Plugin Disabled') {
        if (playerOutput) {
          server.stdin.write('tellraw ' + playerOutput + ' ' + JSON.stringify({
            text: 'Error Loading Plugin ' + pluginName + ': ' + message,
            color: 'red'
          }).replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
        }
        log = log + 'Error Loading Plugin ' + pluginName + ': ' + message + '\n';
        console.log('Error Loading Plugin ' + pluginName + ': ' + message);
      } else {
        if (playerOutput) {
          server.stdin.write('tellraw ' + playerOutput + ' ' + JSON.stringify({
            text: 'Skipping Plugin ' + pluginName + ': ' + message,
            color: 'gold'
          }).replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
        }
        log = log + 'Skipping Plugin ' + pluginName + ': ' + message + '\n';
        console.log('Skipping Plugin ' + pluginName + ': ' + message);
      }
    };

    var success = () => {
      if (playerOutput) {
        server.stdin.write('tellraw ' + playerOutput + ' ' + JSON.stringify({
          text: 'Successfully Loaded Plugin ' + pluginName,
          color: 'green'
        }).replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
      }
      log = log + 'Successfully Loaded Plugin ' + pluginName + '\n';
      console.log('Successfully Loaded Plugin ' + pluginName);
    };
    try {
      delete require.cache[require.resolve('plugins/' + files[i])];
      plugin = require('plugins/' + files[i]);
      if (plugin.hasOwnProperty('disabled') && plugin.disabled) {
        throw 'Plugin Disabled';
      }
      if (plugin.hasOwnProperty('kill')) {
        killPlugin.push(plugin.kill);
      }
    } catch (e) {
      fail(e.toString());
    }
    if (plugin && !plugin.hasOwnProperty('meta')) {
      fail('No Plugin Metadata');
    }
    if (plugin && plugin.hasOwnProperty('meta') && !plugin.meta.hasOwnProperty('name')) {
      fail('No Plugin Name');
    }
    if (plugin && plugin.hasOwnProperty('meta') && !plugin.meta.hasOwnProperty('version')) {
      fail('No Plugin Version');
    }
    if (plugin && !plugin.hasOwnProperty('commands')) {
      fail('No Plugin Commands');
    }
    if (!failed) {
      pluginName = plugin.meta.name + ' ' + plugin.meta.version;
      try {
        plugin.init(exec, (str) => {
          log = log + plugin.meta.name + ': ' + str + '\n';
          console.log(plugin.meta.name + ': ' + str);
        });
      } catch (e) {
        fail(e.toString());
      }
      Object.assign(commands, plugin.commands);
      success();
      plugins.push(plugin.meta);
    }
  }
  commands.serverjs = function(data) {
    switch (data.args[0]) {
      case 'version':
        var version = data.version;
        if (version.startsWith('custom?')) {
          var customVersions = require('jars/manifest');
          for (x in customVersions) {
            if (version === 'custom?' + customVersions[x]) {
              version = x;
            }
          }
        }
        if (version === 'latest-release') {
          version = 'Latest Release';
        }
        if (version === 'latest-snapshot') {
          version = 'Latest Snapshot';
        }
        exec('tellraw ' + data.player + ' ' + JSON.stringify({
          text: 'NodeJS: ' + process.version + '\nMinecraft: ' + version,
          color: 'yellow'
        }));
        break;
      case 'plugins':
        switch (data.args[1]) {
          case 'list':
            var pluginList = '';
            for (k = 0; k < plugins.length; k++) {
              pluginList = pluginList + plugins[k].name + ' ' + plugins[k].version + ': ' + plugins[k].description + '\n';
            }
            exec('tellraw ' + data.player + ' ' + JSON.stringify([
              {
                text: 'Listing All Plugins:\n',
                color: 'yellow'
              },
              {
                text: pluginList,
                color: 'gold'
              }
            ]));
            break;
          case 'reload':
            exec('tellraw ' + data.player + ' ' + JSON.stringify({
              text: 'Reloading All Plugins',
              color: 'yellow'
            }));
            loadPlugins(data.player);
            break;
          case 'commands':
            var commandList = '';
            for (x in commands) {
              var done = false;
              for (k = 0; k < plugins.length; k++) {
                if (plugins[k].commands.hasOwnProperty(x)) {
                  done = true;
                  if (plugins[k].commands[x].args.length > 0) {
                    commandList = commandList + x + ' <' + plugins[k].commands[x].args.join('> <') + '>: ' + plugins[k].commands[x].description + '\n';
                  } else {
                    commandList = commandList + x + ': ' + plugins[k].commands[x].description + '\n';
                  }
                }
              }
              if (!done) {
                commandList = commandList + x + ': No Description\n';
              }
            }
            exec('tellraw ' + data.player + ' ' + JSON.stringify([
              {
                text: 'Listing All Commands:\n',
                color: 'yellow'
              },
              {
                text: commandList,
                color: 'gold'
              }
            ]));
            break;
          case 'help':
            exec('tellraw ' + data.player + ' ' + JSON.stringify([
              {
                text: 'USAGE:\n',
                color: 'yellow'
              },
              {
                text: 'data/serverjs plugins <list|reload|commands|help>',
                color: 'gold'
              }
            ]));
            break;
          default:
            exec('tellraw ' + data.player + ' ' + JSON.stringify({
              text: 'Invalid Command! For More Information See: "serverjs plugins help"',
              color: 'red'
            }));
            break;
        }
        break;
      case 'help':
        exec('tellraw ' + data.player + ' ' + JSON.stringify([
          {
            text: 'USAGE:\n',
            color: 'yellow'
          },
          {
            text: 'data/serverjs <version|plugins|help>',
            color: 'gold'
          }
        ]));
        break;
      default:
        exec('tellraw ' + data.player + ' ' + JSON.stringify({
          text: 'Invalid Command! For More Information See: "serverjs help"',
          color: 'red'
        }));
        break;
    }
  };
}

function runCommand(str, stdin, commands) {
  var strChunk = str.toString().replace(new RegExp('\r', 'g'), '').split('\n');
  for (i = 0; i < strChunk.length; i++) {
    if (strChunk[i].split(']: ').length > 1) {
      strChunk[i] = strChunk[i].split(']: ').slice(1).join(']: ');
    }
  }
  str = str + strChunk.join('\n');
  if (str.startsWith('<')) {
    for (x in commands) {
      var cmdArr = str.split('<');
      if (cmdArr.length > 1) {
        var player = cmdArr[1].split('>')[0];
        var cmd = cmdArr.slice(1).join('<').split('>').slice(1).join('>');
        if (cmd.startsWith(' ' + x)) {
          var args = cmd.split(' ' + x)[1].trim().split(' ');
          try {
            commands[x]({
              player: player,
              args: args,
              version: config.version
            });
          } catch (e) {
            stdin.write('tellraw ' + player + ' ' + JSON.stringify({
              text: e.toString(),
              color: 'red'
            }).replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
            log = log + e.stack + '\n';
            console.error(e);
          }
        }
      }
    }
  }
}

function run() {
  if (server) {
    server.kill();
  }
  var success = build();
  if (pluginsEnabled) {
    loadPlugins(null);
  } else {
    commands = {};
    plugins = [];
    for (i = 0; i < killPlugin.length; i++) {
      killPlugin[i]();
      delete killPlugin[i];
      killPlugin.splice(i, 1);
    }
  }
  if (success) {
    server = spawn('java', ['-Xmx' + (config.ram * 1024) + 'M', '-Xms' + (config.ram * 1024) + 'M', '-jar', 'data/server.jar', 'nogui'], {
      cwd: 'data/server'
    });
    server.on('close', () => {
      if (config.saveServerData) {
        if (!fs.existsSync('data/default')) {
          fs.mkdirSync('data/default');
        }
        if (fs.existsSync('data/server/whitelist.json')) {
          fs.copyFileSync('data/server/whitelist.json', 'data/default/whitelist.json');
        }
        if (fs.existsSync('data/server/white-list.txt')) {
          fs.copyFileSync('data/server/white-list.txt', 'data/default/white-list.txt');
        }
        if (fs.existsSync('data/server/ops.json')) {
          fs.copyFileSync('data/server/ops.json', 'data/default/ops.json');
        }
        if (fs.existsSync('data/server/ops.txt')) {
          fs.copyFileSync('data/server/ops.txt', 'data/default/ops.txt');
        }
        if (fs.existsSync('data/server/banned-players.json')) {
          fs.copyFileSync('data/server/banned-players.json', 'data/default/banned-players.json');
        }
        if (fs.existsSync('data/server/banned-players.txt')) {
          fs.copyFileSync('data/server/banned-players.txt', 'data/default/banned-players.txt');
        }
        if (fs.existsSync('data/server/banned-ips.json')) {
          fs.copyFileSync('data/server/banned-ips.json', 'data/default/banned-ips.json');
        }
        if (fs.existsSync('data/server/banned-ips.txt')) {
          fs.copyFileSync('data/server/banned-ips.txt', 'data/default/banned-ips.txt');
        }
      }
      server = null;
    });
    server.stdout.on('data', chunk => {
      log = log + chunk.toString();
      process.stdout.write(chunk.toString());
      if (pluginsEnabled) {
        runCommand(chunk.toString(), server.stdin, commands);
      }
    });
    server.stderr.on('data', chunk => {
      log = log + chunk.toString();
      process.stdout.write(chunk.toString());
    });
  }
}
run();
var cache = {};

function loadCache() {
  cache = {};
  cache.noServer = {};
  if (!fs.existsSync('data/cache.json') || (fs.existsSync('data/cache.json') && (fs.statSync('data/cache.json').mtime.getTime() + 172800000) < (new Date()).getTime())) {
    var versionsRes = request('GET', 'https://launchermeta.mojang.com/mc/game/version_manifest.json');
    var versionsJson = JSON.parse(versionsRes.getBody());
    for (i = 0; i < versionsJson.versions.length; i++) {
      var versionRes = request('GET', versionsJson.versions[i].url);
      var versionJson = JSON.parse(versionRes.getBody());
      if (!versionJson.downloads.hasOwnProperty('data/server')) {
        cache.noServer[versionsJson.versions[i].id] = true;
      }
    }
    fs.writeFileSync('data/cache.json', JSON.stringify(cache));
  } else {
    cache = JSON.parse(fs.readFileSync('data/cache.json', 'utf8'));
  }
}
loadCache();
if (process.argv.indexOf('--headless') === -1) {
  app.get('/', (req, res) => {
    var versionsRes = request('GET', 'https://launchermeta.mojang.com/mc/game/version_manifest.json');
    var versionsJson = JSON.parse(versionsRes.getBody());
    var versions = [];
    versions.push(['Latest Release', 'latest-release']);
    versions.push(['Latest Snapshot', 'latest-snapshot']);
    if (fs.existsSync('jars/manifest.json')) {
      var customVersions = require('jars/manifest');
      for (x in customVersions) {
        if (fs.existsSync('jars/' + customVersions[x])) {
          versions.push([x, 'custom?' + customVersions[x]]);
        }
      }
    }
    for (i = 0; i < versionsJson.versions.length; i++) {
      if (!cache.noServer[versionsJson.versions[i].id]) {
        versions.push([versionsJson.versions[i].id, versionsJson.versions[i].id]);
      }
    }
    var file = fs.readFileSync('options.html', {
      encoding: 'utf8'
    });
    file = file.replace(new RegExp('CONFIG_JSON', 'g'), JSON.stringify(config));
    file = file.replace(new RegExp('VERSIONS_JSON', 'g'), JSON.stringify(versions));
    res.send(file);
  });
  app.post('/setConfig', (req, res) => {
    res.send('');
    if (server) {
      server.stdin.write('stop\n', 'utf8');
      server.on('close', () => {
        config = req.body.config;
        if (req.body.deleteWorld) {
          rimraf.sync('data/worldDir');
        }
        save();
        run();
      });
    } else {
      config = req.body.config;
      if (req.body.deleteWorld) {
        rimraf.sync('world');
      }
      save();
      run();
    }
  });
  app.get('/log', (req, res) => {
    res.send(log);
  });
  app.post('/command', (req, res) => {
    res.send('');
    server.stdin.write(req.body.text + '\n', 'utf8');
  });
  app.post('/clearLog', (req, res) => {
    res.send('');
    log = '';
  });
  app.post('/login', (req, res) => {
    for (i = 0; i < config.users.length; i++) {
      if (req.body.username === config.users[i][0] && req.body.password === config.users[i][1]) {
        req.session.loggedIn = true;
        res.redirect('/');
      }
    }
    if (!req.session.loggedIn) {
      res.redirect('/login#' + encodeURIComponent('Username And/Or Password Are Incorrect!'));
    }
  });
  app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
  });
  app.listen(80, () => console.log('data/server UI listening on port 80!'));
}
if (process.platform === 'win32') {
  var readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  readline.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}
process.on('SIGINT', function() {
  if (server) {
    server.stdin.write('stop\n', 'utf8');
    server.on('close', () => {
      process.exit();
    });
  } else {
    process.exit();
  }
});
