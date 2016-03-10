var util = require("util");
var path = require("path");
var fs = require("fs");
var Bot = require("slackbots");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var pg = require("pg");

var Cardibot = function Constructor(settings) {
  this.settings = settings;
  this.settings.name = this.settings.name || "cardibot";
  this.dbPath = settings.dbPath;

  this.user = null;
  this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(Cardibot, Bot);

Cardibot.prototype.run = function () {
  Cardibot.super_.call(this, this.settings);

  this.on("start", this._onStart);
  this.on("message", this._onMessage);
};

Cardibot.prototype._onStart = function () {
  this._loadBotUser();
  this._connectDb();
  this._welcomeMessage();
};

Cardibot.prototype._loadBotUser = function () {
  var self = this;
  this.user = this.users.filter(function (user) {
    return user.name === self.name;
  })[0];
};

Cardibot.prototype._connectDb = function () {
  pg.defaults.ssl = true;
  pg.connect(this.dbPath, function(err, client) {
    if (err) throw err;
    console.log('Connected to postgres! Getting schemas...');
    client.query('CREATE TABLE IF NOT EXISTS jdh(id TEXT PRIMARY KEY, score TEXT, temps TEXT);');
    client.query("DELETE FROM jdh WHERE id='bou';");
    client.query("DELETE FROM jdh WHERE id='U0PLYKW9E';");
  });
};

Cardibot.prototype._welcomeMessage = function () {
  this.postMessageToChannel('random', 'Salut mes petits stagiaires ! Alors, la pause est enfin finie ? AU TRAVAIL !',
  {as_user: true});
};

Cardibot.prototype._onMessage = function (message) {
  if (this._isMessageOk(message)) {

    if (this._isMentioningBot(message)) {
      this._replyBasic(message);
    }

    else if (this._isMentioningManger(message)) {
      this._replyManger(message);
    }

    else if (this._isMentioningJdhChuck(message)) {
      this._replyJdhChuck(message);
    }

    else if (this._isMentioningJdh(message)) {
      this._replyJdh(message);
    }

    else if (this._isMentioningScores(message)) {
      this._replyScores(message);
    }

    else if (this._isMentioningExclamation(message)) {
      this._replyExclamation(message);
    }

    if (this._isMentioningChuck(message)) {
      this._replyChuck(message);
    }

  }
};

Cardibot.prototype._isChatMessage = function (message) {
  return message.type === 'message' && Boolean(message.text);
};

Cardibot.prototype._isChannelConversation = function (message) {
  return typeof message.channel === 'string' &&
  message.channel[0] === 'C';
};

Cardibot.prototype._isFromCardibot = function (message) {
  return message.user === this.user.id;
};

Cardibot.prototype._isMessageOk = function (message) {
  return this._isChatMessage(message) && this._isChannelConversation(message) &&
  !this._isFromCardibot(message);
}

Cardibot.prototype._isMentioningBot = function (message) {
  return message.text.toLowerCase().indexOf(this.name) > -1;
};

Cardibot.prototype._replyBasic = function (message) {
  var self = this;
  var channel = self._getChannelById(message.channel);
  self.postMessageToChannel(channel.name, 'C est moi !', {as_user: true});
};

Cardibot.prototype._isMentioningManger = function (message) {
  return message.text.toLowerCase().indexOf('!manger') > -1;
};

Cardibot.prototype._replyManger = function (message) {
  var self = this;
  var channel = self._getChannelById(message.channel);
  var restau = ["Corse", "Subway", "Mongoo", "Pizza", "Japonais",
  "Japonais jusqu'à 15 heures", "MACDO", "Pegast", "les burgers Hipster bio", "Bagel",
  "Toto pizza", "Goutu (les sandwich entre 1 et 3e)", "un nouveau resto tu testeras"];
  var res = Math.trunc(Math.random() * restau.length);
  self.postMessageToChannel(channel.name, "Aujourd'hui vous allez manger " + restau[res] +
  ". Bon appétit à tous !", {as_user: true});
};

Cardibot.prototype._isMentioningJdh = function (message) {
  return message.text.toLowerCase().indexOf('!jdh') > -1;
};

Cardibot.prototype._replyJdh = function (message) {
  var points = Math.trunc(Math.random() * 110)-10;
  this._playJdh(message, points);
};

Cardibot.prototype._isMentioningJdhChuck = function (message) {
  return message.text.toLowerCase().indexOf('!jdhchuck') > -1;
};

Cardibot.prototype._replyJdhChuck = function (message) {
  var points = Math.trunc(Math.random() * 980)-480;
  this._playJdh(message, points);
};

Cardibot.prototype._playJdh = function(message, points) {
  var self = this;
  var channel = self._getChannelById(message.channel);
  var ID = message.user;

  pg.connect(this.dbPath, function(err, client) {
    if (err) {
      return console.error('ERROR', err);
    }
    console.log("Connexion OK dans _playJdh");

    client.query("SELECT score, temps FROM jdh WHERE id = $1", [ID]).on("row", function(err, row, result) {
      if(err) {
        return console.error('ERROR', err);
      }
      if (result.rowCount < 1) {
        console.log('log1');
        client.query("INSERT INTO jdh(id, score, temps) VALUES($1, $2, $3)", [ID, points.toString(), (Math.trunc(message.ts)).toString()]);
        self.postMessageToChannel(channel.name, "Bravo <@" + ID + "> ! Tu marques " + points +
        " points et ton score passe de 0 à " + points.toString(), {as_user: true});
      }
      else {
        console.log('log2');
        var ancienTemps = parseInt(row.temps);
        if (message.ts - ancienTemps < 3600) { // peut pas jouer
          var ts = Math.trunc(3600 - message.ts + ancienTemps);
          var minutes = Math.trunc(ts / 60);
          var secondes = Math.trunc(ts % 60);

          self.postMessageToChannel(channel.name, "Tu ne peux pas encore rejouer. tu pourras rejouer dans : " +
          minutes + " minutes et " + secondes + " secondes.", {as_user: true});
        }
        else {
          console.log('log3');
          var nouveauScore = (parseInt(row.score) + points).toString()

          client.query("UPDATE jdh SET score = ($1) WHERE id ='" + ID + "'", [nouveauScore]);

          self.postMessageToChannel(channel.name, "Bravo <@" + ID + "> ! Tu marques " + points +
          " points et tu passes de " + row.score + " à " + nouveauScore, {as_user: true});

          client.query("UPDATE jdh SET temps = ($1) WHERE id ='" + ID + "'", [(Math.trunc(message.ts)).toString()]);
        }
      }
    });
  });
};

Cardibot.prototype._isMentioningScores = function (message) {
  return message.text.toLowerCase().indexOf('!scores') > -1;
};

Cardibot.prototype._replyScores = function (message) {
  var self = this;
  var channel = self._getChannelById(message.channel);

  pg.connect(this.dbPath, function(err, client) {
    if (err) {
      return console.error("ERROR", err);
    }
    console.log("Connexion Ok dans _replyScores");
    client.query("SELECT id, score FROM jdh ORDER BY score DESC", function(row) {
      if(row === undefined){
        self.postMessageToChannel(channel.name,"Pas encore de joueur !" + row.score, {as_user: true});
      }
      else{
        self.postMessageToChannel(channel.name," <@" + row.id + "> : " + row.score, {as_user: true});
      }
    });
  });
};

Cardibot.prototype._isMentioningExclamation = function (message) {
  return message.text.toLowerCase().indexOf("!") == 0;
};

Cardibot.prototype._replyExclamation = function (message) {
  var self = this;
  var channel = self._getChannelById(message.channel);
  self.postMessageToChannel(channel.name, "Retourne travailler sale stagiaire !", {as_user: true});
};

Cardibot.prototype._isMentioningChuck = function (message) {
  return message.text.toLowerCase().indexOf("chuck") > -1;
};

Cardibot.prototype._replyChuck = function (message) {
  var self = this;
  var channel = self._getChannelById(message.channel);

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      self.postMessageToChannel(channel.name, JSON.parse(xhttp.responseText).value.joke, {as_user: true});
    }
  };
  xhttp.open("GET", "http://api.icndb.com/jokes/random", true);
  xhttp.send();
};

Cardibot.prototype._getChannelById = function (channelId) {
  return this.channels.filter(function (item) {
    return item.id === channelId;
  })[0];
};

module.exports = Cardibot;

// victor = U0M2ZCL6T
// alexandre = U0M30CPEJ
// hermance = U0M39GS4V
// abensimon = U0PLYKW9E
// raphael = U0M2X0W3V
// harold = U0M307X16
// sacha = U0M2Z0B2N
// mathis = ?
