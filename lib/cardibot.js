var util = require("util");
var path = require("path");
var fs = require("fs");
var Bot = require("slackbots");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var pg = require("pg");
var CronJob = require("cron").CronJob;

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
  var self = this;
  pg.defaults.ssl = true;
  self.db = new pg.Client(this.dbPath);
  self.db.connect();
  //this.db.query("DROP TABLE jdh"); // si besoin
  self.db.query("CREATE TABLE IF NOT EXISTS jdh(id TEXT PRIMARY KEY, score INT, temps TEXT);");
  // clear unique à virer après effet
  new CronJob("00 52 08 * * 2", function() {
    console.log("Clear du jdh");
    self.db.query("DELETE FROM jdh");
  }, null, true, "Europe/Paris");
};

// clear du jdh tous les lundis à 8h
new CronJob("00 00 08 * * 1", function() {
  console.log("Clear du jdh");
  this.db.query("DELETE FROM jdh");
}, null, true, "Europe/Paris");

Cardibot.prototype._welcomeMessage = function () {
  this.postTo("random", "Salut mes petits stagiaires ! Alors, la pause est enfin finie ? AU TRAVAIL !",
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
      // TODO: résoudre : spamme les blagues -> bizarre
      //this._replyChuck(message);
    }
  }
};

Cardibot.prototype._isChatMessage = function (message) {
  return message.type === "message" && Boolean(message.text);
};

Cardibot.prototype._isChannelConversation = function (message) {
  return typeof message.channel === "string" &&
  message.channel[0] === "C";
};

Cardibot.prototype._isDirectMessage = function (message) {
  return typeof message.channel === "string" &&
  message.channel[0] === "D";
};

Cardibot.prototype._isFromCardibot = function (message) {
  return message.user === this.user.id;
};

Cardibot.prototype._isMessageOk = function (message) {
  return this._isChatMessage(message) && !this._isFromCardibot(message);
}

Cardibot.prototype._isMentioningBot = function (message) {
  return message.text.toLowerCase().indexOf(this.name) > -1;
};

Cardibot.prototype._replyBasic = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  self.postTo(channel.name, "C'est moi !", {as_user: true});
};

Cardibot.prototype._isMentioningManger = function (message) {
  return message.text.toLowerCase().indexOf("!manger") > -1;
};

Cardibot.prototype._replyManger = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var restau = ["Corse", "Subway", "Mongoo", "Pizza", "Japonais",
  "Japonais jusqu'à 15 heures", "MACDO", "Pegast", "les burgers Hipster bio", "Bagel",
  "Toto pizza", "Goutu (les sandwich entre 1 et 3e)", "un nouveau resto tu testeras"];
  var res = Math.trunc(Math.random() * restau.length);
  self.postTo(channel.name, "Aujourd'hui vous allez manger " + restau[res] +
  ". Bon appétit à tous !", {as_user: true});
};

Cardibot.prototype._isMentioningJdh = function (message) {
  return message.text.toLowerCase().indexOf("!jdh") > -1;
};

Cardibot.prototype._replyJdh = function (message) {
  var points = Math.trunc(Math.random() * 110)-10;
  this._playJdh(message, points);
};

Cardibot.prototype._isMentioningJdhChuck = function (message) {
  return message.text.toLowerCase().indexOf("!jdhchuck") > -1;
};

Cardibot.prototype._replyJdhChuck = function (message) {
  var points = Math.trunc(Math.random() * 980)-480;
  this._playJdh(message, points);
};

Cardibot.prototype._playJdh = function(message, points) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var ID = message.user;

  self.db.query("SELECT score, temps FROM jdh WHERE id = $1", [ID], function(err, result) {
    // joue pour la 1e fois
    if (result.rows.length < 1) {
      self.db.query("INSERT INTO jdh(id, score, temps) VALUES($1, $2, $3)", [ID, points, (Math.trunc(message.ts)).toString()]);
      self.postTo(channel.name, "Bravo <@" + ID + "> ! Tu marques " + points +
      " points et ton score passe de 0 à " + points, {as_user: true});
    }
    else {
      var ancienTemps = parseInt(result.rows[0].temps);
      // peut pas encore jouer
      if (message.ts - ancienTemps < 3600) {
        var ts = Math.trunc(3600 - message.ts + ancienTemps);
        var minutes = Math.trunc(ts / 60);
        var secondes = Math.trunc(ts % 60);
        self.postTo(channel.name, "Tu ne peux pas encore rejouer. tu pourras rejouer dans : " +
        minutes + " minutes et " + secondes + " secondes.", {as_user: true});
      }
      else {
        var nouveauScore = parseInt(result.rows[0].score) + points
        self.db.query("UPDATE jdh SET score = $1 WHERE id = $2", [nouveauScore, ID]);
        self.postTo(channel.name, "Bravo <@" + ID + "> ! Tu marques " + points +
        " points et ton score passe de " + result.rows[0].score + " à " + nouveauScore, {as_user: true});
        self.db.query("UPDATE jdh SET temps = $1 WHERE id = $2", [(Math.trunc(message.ts)).toString(), ID]);
      }
    }
  });
};

Cardibot.prototype._isMentioningScores = function (message) {
  return message.text.toLowerCase().indexOf("!scores") > -1;
};

Cardibot.prototype._replyScores = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);

  // TODO: le order by ne marche pas, si tu trouves pourquoi, t'auras un chocolat
  self.db.query("SELECT id, score FROM jdh ORDER BY score DESC", function(err, result) {
    // personne n'a joué
    if(result.rows.length < 1){
      self.postTo(channel.name,"Personne n'a encore joué (attention, stu commences tu sras spammé gros !)", {as_user: true});
    }
    else {
      // TODO: meme le tri du tableau ne marche pas... MYSTERE TOTAL
      result.rows.sort(function(a, b){
        if (a.score < b.score) return 1;
        if (a.score > b.score) return -1;
        return 0;
      });

      // affichage des resultats
      for(i = 0; i < result.rows.length; i++) {
        self.postTo(channel.name," <@" + result.rows[i].id + "> : " + result.rows[i].score, {as_user: true});
      }
    }
  });
};

Cardibot.prototype._isMentioningExclamation = function (message) {
  return message.text.toLowerCase().indexOf("!") == 0;
};

Cardibot.prototype._replyExclamation = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  self.postTo(channel.name, "Retourne travailler sale stagiaire !", {as_user: true});
};

Cardibot.prototype._isMentioningChuck = function (message) {
  return message.text.toLowerCase().indexOf("chuck") > -1;
};

Cardibot.prototype._replyChuck = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      self.postTo(channel.name, JSON.parse(xhttp.responseText).value.joke, {as_user: true});
    }
  };
  xhttp.open("GET", "http://api.icndb.com/jokes/random", true);
  xhttp.send();
};

Cardibot.prototype._getChannelOrUser = function (message) {
  var self = this;
  if (self._isChannelConversation(message)) {
    return this.channels.filter(function (item) {
      return item.id === message.channel;
    })[0];
  } else if (self._isDirectMessage(message)) {
    return this.users.filter(function (item) {
      return item.id === message.user;
    })[0];
  }
};

module.exports = Cardibot;

// TODO: top des meilleurs scores (negatif et positif)
