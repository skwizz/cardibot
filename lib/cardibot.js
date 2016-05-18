var util = require("util");
var path = require("path");
var fs = require("fs");
var Bot = require("slackbots");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var pg = require("pg");
var CronJob = require("cron").CronJob;

var nbPointsDuel = 0;

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
  self.db.query("CREATE TABLE IF NOT EXISTS duel(id TEXT PRIMARY KEY, nb_points INT)");
  self.db.query("DELETE FROM jdh WHERE id=$1", ["USLACKBOT"]);
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

  // Sanction et récompense aléatoire à la fin de la journée (17h45)
  new CronJob("00 45 17 * * 1-5", function() {
    self._sanctionAleatoire();
  }, null, true, "Europe/Paris");

  // Clear du jdh tous les lundis à 8h
  new CronJob("00 00 08 * * 1", function() {
    console.log("Clear du jdh");
    self.db.query("DELETE FROM jdh");
    self.postTo("random", "C'est lundi, il est 8h, les oiseaux se suicident et les scores ont été réinitialisés !", {as_user: true});
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
  if ((this._isMessageOk(message)) && (this._getChannelOrUser(message).name !== "general")) {
    if (this._isMentioningBot(message)) {
      this._replyBasic(message);
    } else if (this._isMentioningCardicraft(message)) {
      this._replyCardicraft(message);
    } else if (this._isMentioningManger(message)) {
      this._replyManger(message);
    } else if (this._isMentioningJdhChuck(message)) {
      this._replyJdhChuck(message);
    } else if (this._isMentioningJdh(message)) {
      this._replyJdh(message);
    } else if (this._isMentioningScores(message)) {
      this._replyScores(message);
    } else if (this._isMentioningTaux(message)) {
      this._replyTaux(message);
    } else if (this._isMentioningSommaire(message)) {
      this._replySommaire(message);
    } else if (this._isMentioningSacha(message)){
      this._replySacha(message);
    } else if (this._isMentioningDuel(message)) {
      this._replyDuel(message);
    } else if (this._isMentioningJaccepte(message)) {
      this._replyJaccepte(message);
    }

    // A la fin
    else if (this._isMentioningExclamation(message)) {
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

Cardibot.prototype._isMentioningCardicraft = function (message) {
  return message.text.toLowerCase().indexOf("!cardicraft") == 0;
};

Cardibot.prototype._replyManger = function (message) {
  var self = this;
  var channel;
  if (message == null) {
    // Dans channel general
    channel = self.channels[0];
  } else {
    channel = self._getChannelOrUser(message);
  }
  var restau = ["Corse", "Sub", "Mongoo", "Jap", "Jap jusqu'à 15 heures",
  "Domac", "Pegast", "les burgers Hipster bio", "Bagel", "Toto pizza", "BK ma gueule",
  "Toto pates", "Goutu", "un nouveau resto tu testeras"];
  var res = Math.trunc(Math.random() * restau.length);
  self.postTo(channel.name, "Aujourd'hui vous allez manger " + restau[res] +
  ". Bon appétit à tous !", {as_user: true});
};

Cardibot.prototype._isMentioningJdh = function (message) {
  return message.text.toLowerCase().indexOf("!jdh") > -1;
};

Cardibot.prototype._replyJdh = function (message) {
  // Espérance : 45
  var points = this._randomIntFromInterval(-10, 100);
  this._playJdh(message, points);
};

Cardibot.prototype._isMentioningJdhChuck = function (message) {
  return message.text.toLowerCase().indexOf("!jdhchuck") > -1;
};

Cardibot.prototype._isMentioningSacha = function (message) {
  return message.text.toLowerCase().indexOf("!sachaoups") > -1;
};

Cardibot.prototype._replyJdhChuck = function (message) {
  // Espérance : 0
  var points = this._randomIntFromInterval(-500, 500);
  this._playJdh(message, points);
};

Cardibot.prototype._playJdh = function(message, points) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var ID = message.user;

  if (ID.charAt(1) !== "0") {
    self.postTo(channel.name,"Dégage sale robot, c'est un jeu pour les humains ici !", {as_user: true});
    return;
  }

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
      self.db.query("INSERT INTO jdh(id, score, temps, victory, defeat) VALUES($1, $2, $3, 0, 0)", [ID, points, (Math.trunc(message.ts)).toString()]);
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
        var nouveauScore = parseInt(result.rows[0].score) + points;
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

Cardibot.prototype._isMentioningTaux = function (message) {
  return message.text.toLowerCase().indexOf("!taux") > -1;
};

Cardibot.prototype._isMentioningSommaire = function (message) {
  return message.text.toLowerCase().indexOf("!sommaire") > -1;
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

Cardibot.prototype._replyTaux = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);

  self.db.query("SELECT id, defeat, victory FROM jdh ORDER BY score DESC", function(err, result) {
    // Personne n'a joué
    if(result.rows.length < 1){
      self.postTo(channel.name,"Personne n'a encore joué (attention, stu commences tu sras spammé gros !)", {as_user: true});
    } else {
      // Affichage des resultats
      var resString = "";
      for(var i=0, tot=result.rows.length; i < tot; i++) {
        if (result.rows[i].victory + result.rows[i].defeat!=0){
          resString += "<@" + result.rows[i].id + "> : Taux de victoire aux duels de la semaine : " + Math.trunc((result.rows[i].victory / (result.rows[i].victory + result.rows[i].defeat)) * 100) + "% \n";
        }
      }
      self.postTo(channel.name, resString, {as_user: true});
    }
  });
};

Cardibot.prototype._replySacha = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  self.db.query("DELETE FROM cardicraft");
    self.postTo(channel.name, "Sacha est mon maître absolu ! <3", {as_user: true});
};

Cardibot.prototype._replyCardicraft = function (message) {
  //la commande commence par !cardicraft
  var self = this;
  var channel = self._getChannelOrUser(message);
  var ID = message.user;
  this._MajCardior(ID,Math.trunc(message.ts));
  var resString = "";
  if (channel.name == "random" || channel.name == "general" || channel.name == "clope" || channel.name == "evol-du-futur" || channel.name == "tech"){
    self.postTo(channel.name, "Tu devrais plutot essayer dans un message privé à Cardibot ....", {as_user: true});
  }else if (message.text.toLowerCase().indexOf("sommaire") == 12){
    resString += "--------------------Sommaire de CARDICRAFT---------------------\n";
    resString += "Commandes disponibles :\n";
    resString += "!cardicraft start : commande activable une seule fois pour commencer une partie\n";
    resString += "!cardicraft sommaire : voir le sommaire du jeu\n";
    resString += "!cardicraft infos : connaitre son nombre de CardiOr et le cout d'amélioration\n";
    //resString += "!cardicraft upProd : Augmenter son niveau de production de CardiOr\n";
    resString += "-----------------------------------------------------------------------\n";
    self.postTo(channel.name, resString, {as_user: true});
  }else if (message.text.toLowerCase().indexOf("start") == 12){
    self.db.query("SELECT id FROM cardicraft WHERE id = $1", [ID], function(err, result) {
      if (result.rows.length==0){
      self.db.query("INSERT INTO cardicraft (id, nom, ressource, niveaubat, niveauunit, timest) VALUES($1, $2, $3, $4, $5, $6)", [ID, channel.name, 0, 0, 0, Math.trunc(message.ts)]);
        self.db.query("UPDATE cardicraft SET niveaubat=1, niveauunit=1 WHERE id = $1",[ID]);
      resString += "Tu viens de commencer ta partie de CardiCraft !\n";
      resString += "N'hésites pas à utiliser la commande '!cardicraft sommaire' pour connaitre toutes les commandes.";
        self.postTo(channel.name, resString, {as_user: true});
      }else{
        resString += "Tu as déjà une partie en cours.\n";
        resString += "Plus d'informations avec la commande '!cardicraft sommaire'.\n";
        self.postTo(channel.name, resString, {as_user: true});
      }
    });
  }else if (message.text.toLowerCase().indexOf("infos") == 12){
    self.db.query("SELECT nom, ressource, niveaubat FROM cardicraft WHERE id = $1", [ID], function(err, result) {
      if (result.rows.length==1){
        resString += result.rows[0].nom + "\n";
        resString += "Ton Batiment de production de CardiOr est niveau " + result.rows[0].niveaubat + "\n";
        resString += "Tu possèdes " + result.rows[0].ressource + " CardiOr\n";
        self.postTo(channel.name, resString, {as_user: true});
      }else{
        resString += "Tu devrais d'abord lancer ta partie.\n";
        resString += "Plus d'informations avec la commande '!cardicraft sommaire'.\n";
        self.postTo(channel.name, resString, {as_user: true});
      }
    });
  }else {
    resString += "Plus d'informations avec la commande '!cardicraft sommaire'.\n";
  }
};

Cardibot.prototype._CoutBat = function(level){
  var res;
  if (level<11){
    res = 4;
    for (var i= 1;i<level;i++){

    }
  }
};

Cardibot.prototype._MajCardior = function(ID,timestamp2){
  var self = this;
  self.db.query("SELECT id, nom, ressource, niveaubat, timest FROM cardicraft WHERE id = $1", [ID], function(err, result) {
    if (err==null && result.rows[0]!=undefined){
    var prod = 1; // production par minute au niveau 1
      var coef;
    for (var i=1, tot=result.rows[0].niveaubat; i < tot; i++){
      coef = 1.05+(1/i);
      prod = coef * prod;
    }
    var deltaT = timestamp2 - result.rows[0].timest;
      var res = (result.rows[0].ressource+Math.trunc((deltaT/60)*prod));
      console.log("TIENS SACHA ! "+prod+" et "+deltaT+" et "+res);
      if (res!=0) {
        self.db.query("UPDATE cardicraft SET ressource = $1, timest = $2 WHERE id = $3", [res, timestamp2, ID]);
      }
    }
  });
};

Cardibot.prototype._replySommaire = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var resString = "";
  resString += "--------------------Sommaire du CARDIBOT---------------------\n";
  resString += "Commandes disponibles :\n";
  resString += "!manger : choix de restaurant aléatoire\n";
  resString += "!jdh : jouer au jdh classique (-10,100)\n";
  resString += "!jdhchuck : jouer au jdh chuck (-500,500)\n";
  resString += "!scores : afficher les scores de la semaine du jdh\n";
  resString += "!taux : afficher les taux de victoire aux duels de la semaine\n";
  resString += "!duel X : proposer un duel de X points\n";
  resString += "!jaccepte : accepter un duel proposé par quelqu'un dautre\n";
  resString += "-----------------------------------------------------------------------\n";
  self.postTo(channel.name, resString, {as_user: true});
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

Cardibot.prototype._isMentioningDuel = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var ID = message.user;

  if (message.text.toLowerCase().indexOf("!duel ") > -1 && message.text.length <= 10) {
      var nbPoints = message.text.substring(6, message.text.length);
      // Si c'est bien un int et qu'il est inférieur à 1000
      if(Number.isInteger(parseInt(nbPoints)) && parseInt(nbPoints) >= 1 && parseInt(nbPoints) <= 500) {
        self.nbPointsDuel = parseInt(nbPoints);
        return true;
      }
  };
  return false;
};

Cardibot.prototype._replyDuel = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var userId = message.user;

  self._isJdhPlayer(userId, function (res) {
    if(res === false) {
      self.postTo(channel.name, "Arrête de jouer au con <@" + userId + ">, joue d'abord au jdh !", {as_user: true});
      return;
    } else if (res === "last") {
      self.postTo(channel.name, "Et nan t'as pas le droit !", {as_user: true});
      return;
    }

    var nbPoints = self.nbPointsDuel;

    // Clean de la table duel
    self.db.query("DELETE FROM duel");
    // Stockage du duel
    self.db.query("INSERT INTO duel(id, nb_points) VALUES($1, $2)", [userId, nbPoints]);

    self.postTo(channel.name, "<@" + userId + "> propose un duel pour " + nbPoints, {as_user: true});

  });
};

Cardibot.prototype._isMentioningJaccepte = function (message) {
  return message.text.toLowerCase().indexOf("!jaccepte") > -1;
};

Cardibot.prototype._replyJaccepte = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var mecQuiAccepte = message.user;

  self._isJdhPlayer(mecQuiAccepte, function (res) {
    if (res === false) {
      self.postTo(channel.name, "<@" + mecQuiAccepte + ">, il faut que tu joues au jdh pour accepter un duel, bolosse...", {as_user: true});
      return;
    }
    self.db.query("SELECT id, nb_points FROM duel LIMIT 1", function(err, result) {

      // Personne n'a proposé de duel
      if (result.rows.length < 1){
        self.postTo(channel.name,"Personne n'a encore proposé de dududu-dudu duel !", {as_user: true});
        return;
      }

      var mecQuiPropose = result.rows[0].id;

      if (mecQuiAccepte === mecQuiPropose) {
        self.postTo(channel.name, "Ai-je besoin de préciser qu'on ne peut pas accepter son propre duel <@" + mecQuiAccepte + "> ? La prochaine fois tu te prends des baffes !", {as_user: true});
        return;
      }

      var gagnant = "";
      var perdant = "";
      var nbPoints = result.rows[0].nb_points;
      var nbPointsGagnant = Math.floor((0.9)*nbPoints);
      var chance = Math.floor(Math.random() * 2);
      if (chance === 0) {
        gagnant = mecQuiPropose;
        perdant = mecQuiAccepte;
      } else if (chance === 1) {
        gagnant = mecQuiAccepte;
        perdant = mecQuiPropose;
      }
      // Update des scores
      self.db.query("UPDATE jdh SET score = score + $1 WHERE id = $2", [nbPointsGagnant, gagnant]);
      self.db.query("UPDATE jdh SET victory = victory + 1 WHERE id = $1", [gagnant]);
      self.db.query("UPDATE jdh SET score = score - $1 WHERE id = $2", [nbPoints, perdant]);
      self.db.query("UPDATE jdh SET defeat = defeat + 1 WHERE id = $1", [perdant]);
      // Clean de la table duel
      self.db.query("DELETE FROM duel");

      self.postTo(channel.name, "(duel à " + nbPoints + ") <@" + gagnant + "> a le plus de CHATTE : + " + nbPointsGagnant + " !! Dommage pour " + "<@" + perdant + ">...", {as_user: true});
    });
  });
};

Cardibot.prototype._deciderRecompense = function () {
  var self = this;
  var recompenses = ["une bière au prochain afterwork", "un pain au chocolat lundi matin", "3 cookies au prochain Sub",
  "1 café-flemme par jour la semaine prochaine"];
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

Cardibot.prototype._isJdhPlayer = function (id, callback) {
  this.db.query("SELECT id FROM jdh ORDER BY score ASC", function(err, result) {
    for(var i=0, tot=result.rows.length; i < tot; i++) {
      if (id === result.rows[i].id) {
        callback(i === 0 ? "last" : true);
        return;
      }
    }
    callback(false);
  });
};

Cardibot.prototype._randomIntFromInterval = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

module.exports = Cardibot;

// TODO: Message du bot à un moment random dans la journée, et le 1er à répondre reçoit un bonus ("qui est la ?")
// TODO: Top des meilleurs scores de la semaine (negatif et positif)
// TODO: Stats de la journée et de la semaine (moyenne, max et min)
// TODO: Compteur de jdh avec +50 pour le 100e ("Vous êtes le 100e visiteur !!")
// TODO: Fonction !ouinon
// TODO: Créer table de quotes et !addquote !quote
// TODO: Rajouter options bouffe et faire fonction qui affiche toutes les options
// TODO: Nombres spéciaux (active effets particuliers quand score tombe à 404, etc.)
// TODO: Rajouter de l'aléatoire dans les duels (plus de chance de gagner quand tu es en bas et moins quand tu es en haut)

// CARDICRAFT
// TODO: Rajouter un système de temps pour les améliorations de batiments
// TODO: Rajouter une amélioration d'unité
