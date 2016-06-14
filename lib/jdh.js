var CronJob = require("cron").CronJob;

var nbPointsDuel = 0;

_jdhCron = function () {
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
};

_isMentioningJdh(message) = function() {
  if (this._isMentioningSommaire(message)) {
  this._replySommaire(message);
  } else if (this._isMentioningJdhBasic(message)) {
    this._replyJdhBasic(message);
  } else if (this._isMentioningJdhChuck(message)) {
  this._replyJdhChuck(message);
  } else if (this._isMentioningScores(message)) {
  this._replyScores(message);
  } else if (this._isMentioningTaux(message)) {
  this._replyTaux(message);
  } else if (this._isMentioningDuel(message)) {
  this._replyDuel(message);
  } else if (this._isMentioningJaccepte(message)) {
  this._replyJaccepte(message);
  }
}

_isMentioningSommaire = function (message) {
  return message.text.toLowerCase().indexOf("!sommaire") > -1;
};

_replySommaire = function (message) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var resString = "";
  resString += "--------------------Sommaire du JDH---------------------\n";
  resString += "Commandes disponibles :\n";
  resString += "!jdh : jouer au jdh classique (-10,100)\n";
  resString += "!jdhchuck : jouer au jdh chuck (-500,500)\n";
  resString += "!scores : afficher les scores de la semaine du jdh\n";
  resString += "!taux : afficher les taux de victoire aux duels de la semaine\n";
  resString += "!duel X : proposer un duel de X points\n";
  resString += "!jaccepte : accepter un duel proposé par quelqu'un dautre\n";
  resString += "-----------------------------------------------------------------------\n";
  self.postTo(channel.name, resString, {as_user: true});
};

_isMentioningJdhBasic = function (message) {
  return message.text.toLowerCase().indexOf("!jdh") > -1;
};

_replyJdhBasic = function (message) {
  // Espérance : 45
  var points = this._randomIntFromInterval(-10, 100);
  this._playJdh(message, points);
};

_isMentioningJdhChuck = function (message) {
  return message.text.toLowerCase().indexOf("!jdhchuck") > -1;
};

_replyJdhChuck = function (message) {
  // Espérance : 0
  var points = this._randomIntFromInterval(-500, 500);
  this._playJdh(message, points);
};

_isMentioningScores = function (message) {
  return message.text.toLowerCase().indexOf("!scores") > -1;
};

_replyScores = function (message) {
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

_isMentioningTaux = function (message) {
  return message.text.toLowerCase().indexOf("!taux") > -1;
};

_replyTaux = function (message) {
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
          resString += "<@" + result.rows[i].id + "> : " + (result.rows[i].victory + result.rows[i].defeat) + " duels, win : "
            + Math.trunc((result.rows[i].victory / (result.rows[i].victory + result.rows[i].defeat)) * 100) + " % \n";
        }
      }
      self.postTo(channel.name, resString, {as_user: true});
    }
  });
};

_isMentioningDuel = function (message) {
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

_replyDuel = function (message) {
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

_isMentioningJaccepte = function (message) {
  return message.text.toLowerCase().indexOf("!jaccepte") > -1;
};

_replyJaccepte = function (message) {
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

_isJdhPlayer = function (id, callback) {
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

_playJdh = function(message, points) {
  var self = this;
  var channel = self._getChannelOrUser(message);
  var ID = message.user;

  if (ID == "USLACKBOT") {
    self.postTo(channel.name,"Dégage sale robot, c'est un jeu pour les humains ici ! "+ID , {as_user: true});
    return;
  }

  // Jackpot de +1000 ou -1000 (chance : 1/100)
  var chance = Math.floor(Math.random() * 100);
  if (chance === 0) {
    points = -1000;
  } else if (chance === 1) {
    points = 1000;
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

_sanctionAleatoire = function () {
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

_deciderRecompense = function () {
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
};

// TODO: Trouver meilleur moyen d'empecher les bots de jouer au jdh
// TODO: Message du bot à un moment random dans la journée, et le 1er à répondre reçoit un bonus ("qui est la ?")
// TODO: Top des meilleurs scores de la semaine (negatif et positif)
// TODO: Stats de la journée et de la semaine (moyenne, max et min)
// TODO: Compteur de jdh avec +50 pour le 100e ("Vous êtes le 100e visiteur !!")
// TODO: Fonction !ouinon
// TODO: Créer table de quotes et !addquote !quote
// TODO: Nombres spéciaux (active effets particuliers quand score tombe à 404, etc.)
// TODO: Rajouter de l'aléatoire dans les duels (plus de chance de gagner quand tu es en bas et moins quand tu es en haut)
