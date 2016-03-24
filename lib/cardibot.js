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

// Inherits methods and properties from the Bot constructor
util.inherits(Cardibot, Bot);

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
  pg.defaults.ssl = true;
  self.db = new pg.Client(this.dbPath);
  self.db.connect();
  self.db.query("CREATE TABLE IF NOT EXISTS jdh(id TEXT PRIMARY KEY, score INT, temps TEXT)");
};

Cardibot.prototype._cronJobs = function () {
  var self = this;

  // Pause de 10h30
  new CronJob("00 30 10 * * 1-5", function() {
    self.postTo("random", "@everyone: Il est 10h30, première pause de la journée mes petits cocos !", {as_user: true});
  }, null, true, "Europe/Paris");

  // Pause de midi
  new CronJob("00 00 12 * * 1-5", function() {
    self.postTo("random", "@everyone: Il est midi, c'est l'heure d'aller casser la croute !", {as_user: true});
  }, null, true, "Europe/Paris");

  // Pause de 15h
  new CronJob("00 00 15 * * 1-5", function() {
    self.postTo("random", "@everyone: Il est 15h, je sais que vous êtes en train de décéder, aller, ptite pause !", {as_user: true});
  }, null, true, "Europe/Paris");

  // Pause de 17h
  new CronJob("00 00 17 * * 1-5", function() {
    self.postTo("random", "@everyone: Il est 17h, dernière pause de la journée, courage !", {as_user: true});
  }, null, true, "Europe/Paris");

  // Sanction et récompense aléatoire à la fin de la journée (17h45)
  new CronJob("00 45 17 * * 1-5", function() {
    self._sanctionAleatoire();
  }, null, true, "Europe/Paris");

  // Clear du jdh tous les lundis à 8h
  new CronJob("00 00 08 * * 1", function() {
    console.log("Clear du jdh");
    self.db.query("DELETE FROM jdh");
    self.postTo("random", "C'est lundi, il est 8h, les oiseaux chantent et les scores ont été réinitialisés !", {as_user: true});
  }, null, true, "Europe/Paris");

  // Decider de la recompense que doit le perdant au gagnant a la fin de la semaine (vendredi 18h)
  new CronJob("00 00 18 * * 5", function() {
    self._deciderRecompense();
  }, null, true, "Europe/Paris");
}

Cardibot.prototype._welcomeMessage = function () {
  this.postTo("random", "Salut mes petits stagiaires ! Alors, la pause est enfin finie ? AU TRAVAIL !", {as_user: true});
};

Cardibot.prototype._onMessage = function (message) {
  if (this._isMessageOk(message)) {
    if (this._isMentioningBot(message)) {
      this._replyBasic(message);
    } else if (this._isMentioningManger(message)) {
      this._replyManger(message);
    } else if (this._isMentioningJdhChuck(message)) {
      this._replyJdhChuck(message);
    } else if (this._isMentioningJdh(message)) {
      this._replyJdh(message);
    } else if (this._isMentioningScores(message)) {
      this._replyScores(message);
    } else if (this._isMentioningExclamation(message)) {
      this._replyExclamation(message);
    }
    // TODO: Résoudre : spamme les blagues -> bizarre
    /*
    if (this._isMentioningChuck(message)) {
    this._replyChuck(message);
  }
  */
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

  // Jackpot de +1000 ou -1000 (chance : 1/100)
  var chance = Math.floor(Math.random() * 100);
  if (chance === 0) {
    points = -1000;
    console.log("Jackpot " + points);
  } else if (chance === 1) {
    points = 1000;
    console.log("Jackpot " + points);
  }

  self.db.query("SELECT score, temps FROM jdh WHERE id = $1", [ID], function(err, result) {
    // Joue pour la 1e fois
    if (result.rows.length < 1) {
      self.db.query("INSERT INTO jdh(id, score, temps) VALUES($1, $2, $3)", [ID, points, (Math.trunc(message.ts)).toString()]);
      self.postTo(channel.name, "Bravo <@" + ID + "> ! Tu marques " + points +
      " points et ton score passe de 0 à " + points, {as_user: true});
    } else {
      var ancienTemps = parseInt(result.rows[0].temps);
      // Peut pas encore jouer
      if (message.ts - ancienTemps < 3600) {
        var ts = Math.trunc(3600 - message.ts + ancienTemps);
        var minutes = Math.trunc(ts / 60);
        var secondes = Math.trunc(ts % 60);
        self.postTo(channel.name, "Tu ne peux pas encore rejouer. tu pourras rejouer dans : " +
        minutes + " minutes et " + secondes + " secondes.", {as_user: true});
      } else {
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

  self.db.query("SELECT id, score FROM jdh ORDER BY score DESC", function(err, result) {
    // Personne n'a joué
    if(result.rows.length < 1){
      self.postTo(channel.name,"Personne n'a encore joué (attention, stu commences tu sras spammé gros !)", {as_user: true});
    } else {
      // Affichage des resultats
      var resString = "";
      for(var i=0, tot=result.rows.length; i < tot; i++) {
        resString += "<@" + result.rows[i].id + "> : " + result.rows[i].score + "\n";
      }
      self.postTo(channel.name, resString, {as_user: true});
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

Cardibot.prototype._deciderRecompense = function () {
  var self = this;
  var recompenses = ["une bière au prochain afterwork", "un pain au chocolat lundi matin", "3 cookies au prochain Sub",
  "3 cafés-flemme dans la semaine"];
  var indice = Math.trunc(Math.random() * recompenses.length);
  self.db.query("SELECT id FROM jdh ORDER BY score ASC LIMIT 1", function(err, result) {
    var finalString = "";
    finalString += "BIM : <@" + result.rows[0].id + "> doit " + recompenses[indice] + " à ";
    self.db.query("SELECT id FROM jdh ORDER BY score DESC LIMIT 1", function(err, result) {
      finalString += "<@" + result.rows[0].id + "> !";
      self.postTo("random", finalString, {as_user: true});
    });
  });
  console.log("Récompense fixée");
};

Cardibot.prototype._sanctionAleatoire = function () {
  var self = this;
  var sanction = 200;
  var recompense = 100;
  var userSanctionneId;
  var userRecompenseId;

  // Obtenir un id aléatoire parmi les joueurs
  self.db.query("SELECT id FROM jdh OFFSET floor(random() * (SELECT COUNT(*) FROM jdh)) LIMIT 1;", function(err, result) {
    var finalString = "";
    userSanctionneId = result.rows[0].id;
    self.db.query("UPDATE jdh SET score = score - $1 WHERE id = $2", [sanction, userSanctionneId]);
    finalString += "<@" + userSanctionneId + "> obtient la sanction de - " + sanction + " !\n";

    self.db.query("SELECT id FROM jdh OFFSET floor(random() * (SELECT COUNT(*) FROM jdh)) LIMIT 1;", function(err, result) {
      userRecompenseId = result.rows[0].id;
      self.db.query("UPDATE jdh SET score = score + $1 WHERE id = $2", [recompense, userRecompenseId]);
      finalString += "<@" + userRecompenseId + "> obtient la récompense de + " + recompense + " !";

      self.postTo("random", finalString, {as_user: true});
    });
  });
};

Cardibot.prototype._getChannelOrUser = function (message) {
  var self = this;
  if (self._isChannelConversation(message)) {
    return self.channels.filter(function (item) {
      return item.id === message.channel;
    })[0];
  } else if (self._isDirectMessage(message)) {
    return self.users.filter(function (item) {
      return item.id === message.user;
    })[0];
  }
};

module.exports = Cardibot;

// TODO (IMPORTANT) : Stocker et utiliser les noms au lieu des ids des users

// TODO: Top des meilleurs scores de la semaine (negatif et positif)
// TODO: Shifoumi contre quelqu'un en pariant des points
// TODO: Stats de la journée et de la semaine (moyenne, max et min)
// TODO: Compteur de jdh avec +50 pour le 100e ("Vous êtes le 100e visiteur !!")
