const fs = require('fs-extra');
const rimraf = require('rimraf');
const escapeString = require('escape-string-regexp');
const request = require('sync-request');
const { spawn } = require('child_process');
const express = require('express');
const session = require('express-session');
const app = express();
  
if (process.argv.indexOf('--headless') === -1) {
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));
  app.use(session({
    name: 'node-js-server-cookie',
    secret: 'NodeJs Minecraft Server',
    saveUninitialized: true,
    resave: true
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
  saveServerData: true
};
var config = null;
function load() {
  config = null;
  if (fs.existsSync('config.json')) config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  if (!config) {
    config = defaultConfig;
    save();
  }
}
function save() {
  fs.writeFileSync('config.json', JSON.stringify(config));
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
function build() {
  rimraf.sync('server');
  fs.mkdirSync('server');
  if (!config.version.startsWith('custom?')) {
    var versionsRes = request('GET', 'https://launchermeta.mojang.com/mc/game/version_manifest.json');
    var versionsJson = JSON.parse(versionsRes.getBody());
    var version = config.version;
    if (version === 'latest-release') version = versionsJson.latest.release;
    if (version === 'latest-snapshot') version = versionsJson.latest.snapshot;
    var url = '';
    for (i = 0; i < versionsJson.versions.length; i++) {
      if (version === versionsJson.versions[i].id) url = versionsJson.versions[i].url;
    }
    var jarRes = request('GET', url);
    var versionJson = JSON.parse(jarRes.getBody());
    if (!versionJson.downloads.hasOwnProperty('server')) {
      log = log + 'Version Does Not have A Server Download, Please Select Another Version\n';
      return false;
    }
    var jar = request('GET', versionJson.downloads.server.url);
    fs.writeFileSync('server/server.jar', jar.getBody());
  } else {
    if (fs.existsSync('jars/manifest.json')) {
      customVersions = JSON.parse(fs.readFileSync('jars/manifest.json', 'utf8'));
      for (x in customVersions) {
        if ('custom?' + customVersions[x] === config.version && fs.existsSync('jars/' + customVersions[x])) {
          fs.copyFileSync('jars/' + customVersions[x], 'server/server.jar');
          if (fs.existsSync('jars/' + customVersions[x].substring(0, customVersions[x].lastIndexOf('.')) + '/')) fs.copySync('jars/' + customVersions[x].substring(0, customVersions[x].lastIndexOf('.')) + '/', 'server/');
        } else if ('custom?' + customVersions[x] === config.version) {
          log = log + 'Custom Version Not Found, Please Select Another Version\n';
          return false;
        }
      }
    }
  }
  if (fs.existsSync('default/')) fs.copySync('default/', 'server/');
  if (!fs.existsSync('worldDir')) fs.mkdirSync('worldDir');
  fs.writeFileSync('server/eula.txt', 'eula=true');
  fs.writeFileSync('server/server.properties', serverProperties());
  return true;
}
var server = null;
var log = '';
var commands = {};
var plugins = [];
function loadPlugins() {
  commands = {};
  plugins = [{
    name: 'ServerJS Built-In',
    version: '1.0.0',
    description: 'Contains Built In ServerJS Command',
    commands: {
      serverjs: {
        args: '<version|plugins|help>',
        description: 'Built-In ServerJS Command'
      }
    }
  }];
  if (!fs.existsSync('plugins')) fs.mkdirSync('plugins');
  var files = fs.readdirSync('plugins');
  for (i = 0; i < files.length; i++) {
    var plugin = require('./plugins/' + files[i]);
    Object.assign(commands, plugin.commands);
    plugins[i] = plugin.meta;
  }
  commands.serverjs = function (player, args, exec) {
    switch (args[0]) {
      case 'version':
        var version = config.version;
        if (version.startsWith('custom?')) {
          customVersions = require('jars/manifest');
          for (x in customVersions) {
            if (version === 'custom?' + customVersions[x]) version = x;
          }
        }
        if (version === 'latest-release') version = 'Latest Release';
        if (version === 'latest-snapshot') version = 'Latest Snapshot';
        exec('tellraw ' + player + ' ' + JSON.stringify({
          text: 'NodeJS: ' + process.version + '\nMinecraft: ' + version,
          color: 'yellow'
        }));
        break;
      case 'plugins':
        switch (args[1]) {
          case 'list':
            var text = '';
            for (k = 0; k < plugins.length; k++) {
              text = text + plugins[k].name + ' ' + plugins[k].version + ': ' + plugins[k].description + '\n';
            }
            exec('tellraw ' + player + ' ' + JSON.stringify(['', {
                text: 'Listing All Plugins:\n',
                color: 'yellow'
              },
              {
                text: text,
                color: 'gold'
              }
            ]));
            break;
          case 'reload':
            exec('tellraw ' + player + ' ' + JSON.stringify({
              text: 'Reloading All Plugins',
              color: 'yellow'
            }));
            loadPlugins();
            break;
          case 'commands':
            var text = '';
            for (x in commands) {
              var done = false;
              for (k = 0; k < plugins.length; k++) {
                if (plugins[k].commands.hasOwnProperty(x)) {
                  done = true;
                  if (plugins[k].commands[x].args.length > 0) {
                    text = text + x + ' ' + plugins[k].commands[x].args + ': ' + plugins[k].commands[x].description + '\n';
                  } else {
                    text = text + x + ': ' + plugins[k].commands[x].description + '\n';
                  }
                }
              }
              if (!done) {
                text = text + x + ': No Description\n';
              }
            }
            exec('tellraw ' + player + ' ' + JSON.stringify(['', {
                text: 'Listing All Commands:\n',
                color: 'yellow'
              },
              {
                text: text,
                color: 'gold'
              }
            ]));
            break;
          case 'help':
            exec('tellraw ' + player + ' ' + JSON.stringify({
              text: 'ServerJS: plugins <list|reload|commands|help>',
              color: 'yellow'
            }));
            break;
          default:
            exec('tellraw ' + player + ' ' + JSON.stringify({
              text: 'Please Specify A Command!',
              color: 'red'
            }));
            break;
        }
        break;
      case 'help':
        exec('tellraw ' + player + ' ' + JSON.stringify({
          text: 'ServerJS: <version|plugins|help>',
          color: 'red'
        }));
        break;
      default:
        exec('tellraw ' + player + ' ' + JSON.stringify({
          text: 'Please Specify A Command!',
          color: 'red'
        }));
        break;
    }
  };
}
loadPlugins();
function runCommand(str, stdin, commands) {
  if (str.split(']: ').length > 1) str = str.split(']: ')[1];
  for (x in commands) {
    var cmdArr = str.split('<');
    if (cmdArr.length > 1) {
      var player = cmdArr[1].split('>')[0];
      var cmd = cmdArr[1].split('>')[1];
      if (cmd.startsWith(' ' + x)) {
        var args = cmd.split(' ' + x)[1].trim().split(' ');
        try {
          commands[x](player, args, function(cmd) {
            stdin.write(cmd.replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
          });
        } catch (e) {
          stdin.write('tellraw ' + player + ' ' + JSON.stringify({
            text: e.stack.replace(new RegExp(escapeString(__dirname), 'g'), '<MODULE ROOT>'),
            color: 'red'
          }).replace(new RegExp('\n', 'g'), '').replace(new RegExp('\r', 'g'), '') + '\n', 'utf8');
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
  if (success) {
    server = spawn('java', ['-Xmx' + (config.ram * 1024) + 'M', '-Xms' + (config.ram * 1024) + 'M', '-jar', 'server.jar', 'nogui'], {cwd: 'server'});
    server.on('close', () => {
      if (config.saveServerData) {
        if (!fs.existsSync('default')) fs.mkdirSync('default');
        if (fs.existsSync('server/whitelist.json')) fs.copyFileSync('server/whitelist.json', 'default/whitelist.json');
        if (fs.existsSync('server/white-list.txt')) fs.copyFileSync('server/white-list.txt', 'default/white-list.txt');
        if (fs.existsSync('server/ops.json')) fs.copyFileSync('server/ops.json', 'default/ops.json');
        if (fs.existsSync('server/ops.txt')) fs.copyFileSync('server/ops.txt', 'default/ops.txt');
        if (fs.existsSync('server/banned-players.json')) fs.copyFileSync('server/banned-players.json', 'default/banned-players.json');
        if (fs.existsSync('server/banned-players.txt')) fs.copyFileSync('server/banned-players.txt', 'default/banned-players.txt');
        if (fs.existsSync('server/banned-ips.json')) fs.copyFileSync('server/banned-ips.json', 'default/banned-ips.json');
        if (fs.existsSync('server/banned-ips.txt')) fs.copyFileSync('server/banned-ips.txt', 'default/banned-ips.txt');
      }
      server = null;
    });
    server.stdout.on('data', chunk => {
      log = log + chunk.toString();
      process.stdout.write(chunk.toString());
      runCommand(chunk.toString(), server.stdin, commands);
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
  if (!fs.existsSync('cache.json') || (fs.existsSync('cache.json') && (fs.statSync('cache.json').mtime.getTime() + 172800000) < (new Date()).getTime())) {
    var versionsRes = request('GET', 'https://launchermeta.mojang.com/mc/game/version_manifest.json');
    var versionsJson = JSON.parse(versionsRes.getBody());
    for (i = 0; i < versionsJson.versions.length; i++) {
      var versionRes = request('GET', versionsJson.versions[i].url);
      var versionJson = JSON.parse(versionRes.getBody());
      if (!versionJson.downloads.hasOwnProperty('server')) {
        cache.noServer[versionsJson.versions[i].id] = true;
      }
    }
    fs.writeFileSync('cache.json', JSON.stringify(cache));
  } else {
    cache = JSON.parse(fs.readFileSync('cache.json', 'utf8'));
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
      customVersions = require('jars/manifest');
      for (x in customVersions) {
        if (fs.existsSync('jars/' + customVersions[x])) versions.push([x, 'custom?' + customVersions[x]]);
      }
    }
    for (i = 0; i < versionsJson.versions.length; i++) {
      if (!cache.noServer[versionsJson.versions[i].id]) versions.push([versionsJson.versions[i].id, versionsJson.versions[i].id]);
    }
    var file = fs.readFileSync('options.html', {encoding: 'utf8'});
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
        if (req.body.deleteWorld) rimraf.sync('worldDir');
        save();
        run();
      });
    } else {
      config = req.body.config;
      if (req.body.deleteWorld) rimraf.sync('world');
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
  app.listen(80, () => console.log('Server UI listening on port 80!'));
}
if (process.platform === "win32") {
  var readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });
  readline.on("SIGINT", () => {
    process.emit("SIGINT");
  });
}
process.on('SIGINT', function () {
  if (server) {
    server.stdin.write('stop\n', 'utf8');
    server.on('close', () => {
      process.exit();
    });
  } else {
    process.exit();
  }
});
