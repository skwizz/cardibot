var Util = require("util");
var Bot = require("slackbots");
var Pg = require("pg");
var CronJob = require("cron").CronJob;
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var Utils = require("utils.js");
var Manger = require("manger.js");
var Jdh = require("jdh.js");
var Cardicraft = require("cardicraft.js");

var Cardibot = function Constructor(settings) {
  this.settings = settings;
  this.settings.name = this.settings.name || "cardibot";
  this.dbPath = settings.dbPath;
  this.user = null;
  this.db = null;
};

// Inherits methods and properties from the Bot constructor
Util.inherits(Cardibot, Bot);

Cardibot.prototype.run = function () {
  Cardibot.super_.call(this, this.settings);
  this.on("start", this._onStart);
  this.on("message", this._onMessage);
};

Cardibot.prototype._onStart = function () {
  this._loadBotUser();
  this._connectDb();
  this._cronJobs();
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
  Pg.defaults.ssl = true;
  self.db = new Pg.Client(this.dbPath);
  self.db.connect();
  self.db.query("CREATE TABLE IF NOT EXISTS jdh(id TEXT PRIMARY KEY, score INT, temps TEXT)");
  self.db.query("CREATE TABLE IF NOT EXISTS duel(id TEXT PRIMARY KEY, nb_points INT)");
};

Cardibot.prototype._cronJobs = function () {
  var self = this;

  // Pause de 10h30
  new CronJob("00 30 10 * * 1-5", function() {
    self.postTo("general", "<!everyone>: Il est 10h30, première pause de la journée mes petits cocos !", {as_user: true});
  }, null, true, "Europe/Paris");

  // Pause de midi
  new CronJob("00 00 12 * * 1-5", function() {
    self.postTo("general", "<!everyone>: Il est midi, c'est l'heure d'aller casser la croute !", {as_user: true});
    self._replyManger(null);
  }, null, true, "Europe/Paris");

  // Pause de 15h
  new CronJob("00 00 15 * * 1-5", function() {
    self.postTo("general", "<!everyone>: Il est 15h, je sais que vous êtes en train de décéder, aller, ptite pause !", {as_user: true});
  }, null, true, "Europe/Paris");

  // Pause de 17h
  new CronJob("00 00 17 * * 1-5", function() {
    self.postTo("general", "<!everyone>: Il est 17h, dernière pause de la journée, courage !", {as_user: true});
  }, null, true, "Europe/Paris");

  Jdh._jdhCron();
}

Cardibot.prototype._welcomeMessage = function () {
  this.postTo("random", "Salut mes petits stagiaires ! Alors, la pause est enfin finie ? AU TRAVAIL !", {as_user: true});
};

Cardibot.prototype._onMessage = function (message) {
  if ((Utils._isMessageOk(message)) && (Utils._getChannelOrUser(message).name !== "general")) {
    if (this._isMentioningBot(message)) {
      this._replyBasic(message);
    } else if (Manger._isMentioningManger(message)) {
      Manger._replyManger(message);
    } else if (Cardicraft._isMentioningCardicraft(message)) {
      Cardicraft._replyCardicraft(message);
    }
    // A la fin
    else if (this._isMentioningExclamation(message)) {
      this._replyExclamation(message);
    }
    if (this._isMentioningChuck(message)) {
    this._replyChuck(message);
    }
    Jdh._isMentioningJdh(message);
  }
};

Cardibot.prototype._isMentioningBot = function (message) {
  return message.text.toLowerCase().indexOf(this.name) > -1;
};

Cardibot.prototype._replyBasic = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  self.postTo(channel.name, "C'est moi !", {as_user: true});
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

module.exports = Cardibot;

// TODO: Changer horaires de pause ?

// @abensimon U0PLYKW9E
// @gunther U1B13MYPQ
// @harold U0M307X16
// @hermy U0M39GS4V
// @mathis U0NE89KK8
// @sacha U0M2Z0B2N
// @victor U0M2ZCL6T
