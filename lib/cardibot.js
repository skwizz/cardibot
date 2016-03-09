'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var Bot = require('slackbots');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var scores = JSON.parse('{ "U0M2Z0B2N": [ 1056, 1457457094 ],"U0M39GS4V": [ 804, 1457457215 ],"U0NE89KK8": [ 547, 1457457194 ],"U0M2ZCL6T": [ 963, 1457457114 ],"U0M30CPEJ": [ 617, 1457455417 ],"U0M307X16": [ 711, 1457449572 ],"U0PLYKW9E": [ 841, 1457456684 ] }');

function compareNombres(a, b) {
  return b - a;
}

var Cardibot = function Constructor(settings) {
  this.settings = settings;
  this.settings.name = this.settings.name || 'cardibot';

  this.user = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(Cardibot, Bot);

Cardibot.prototype.run = function () {
  Cardibot.super_.call(this, this.settings);

  this.on('start', this._onStart);
  this.on('message', this._onMessage);
};

Cardibot.prototype._onStart = function () {
  this._loadBotUser();
};

Cardibot.prototype._loadBotUser = function () {
  var self = this;
  this.user = this.users.filter(function (user) {
    return user.name === self.name;
  })[0];
};

Cardibot.prototype._onMessage = function (message) {
  if (this._isMessageOk(message)) {

    if (this._isMentioningBot(message)) {
      this._replyBasic(message);
    }

    else if (this._isMentioningManger(message)) {
      this._replyManger(message);
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

    else if (this._isSachaSpeaking(message)) {
      this._replySachaSpeaking(message);
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
  self.postMessageToChannel(channel.name, "C'est moi !", {as_user: true});
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
  var self = this;
  var channel = self._getChannelById(message.channel);
  var points = Math.trunc(Math.random() * 110)-10;
  var ID = message.user;
  if (Object.keys(scores).indexOf(ID) == -1) {
    self.postMessageToChannel(channel.name, "Bravo <@" + ID + "> ! Tu marques " + points + " points !!!", {as_user: true});
      console.log("On a pas encore cette personne.");
    scores[ID] = [points, Math.trunc(message.ts)];
  } else if (message.ts - scores[ID][1] < 3600) {
    var ts = Math.trunc(3600 - message.ts + scores[ID][1]);
    var minutes = Math.trunc(ts / 60);
    var secondes = Math.trunc(ts % 60);
    self.postMessageToChannel(channel.name, "Tu ne peux pas encore rejouer. tu pourras rejouer dans : " +
      minutes + " minutes et " + secondes + " secondes.", {as_user: true});
  }
  else {
    self.postMessageToChannel(channel.name, "Bravo <@" + ID + "> ! Tu marques " + points + " points !!!",
      {as_user: true});
    console.log(scores[ID]);
    scores[ID][0] = scores[ID][0] + points;
    scores[ID][1] = Math.trunc(message.ts);
    console.log(scores[ID]);
  }
  console.log(scores);
};

Cardibot.prototype._isMentioningScores = function (message) {
  return message.text.toLowerCase().indexOf('!scores') > -1;
};

Cardibot.prototype._replyScores = function (message) {
  var self = this;
  var channel = self._getChannelById(message.channel);
  var rendu = "";
  var points = []
  for (var index in Object.keys(scores)) {
    var ID2 = Object.keys(scores)[index];
    points.push(scores[ID2][0]);
  }
  points.sort(compareNombres);
  for (var index in points) {
    var temp = points[index];
    var temp2=scores;
    var listeID = Object.keys(temp2);
    for (var index2 in listeID) {
      var ID = listeID[index2];
      if (temp==temp2[ID][0]){
        rendu = rendu + "<@" + ID + "> totalise " + temp2[ID][0] + " points.\n";
      }
    }
  }
  console.log(rendu);
  self.postMessageToChannel(channel.name, rendu, {as_user: true});
  console.log("On a bien renvoyé les scores triés !");
};

Cardibot.prototype._isMentioningExclamation = function (message) {
  return message.text.toLowerCase().indexOf('!') == 0;
};

Cardibot.prototype._replyExclamation = function (message) {
  var self = this;
  var channel = self._getChannelById(message.channel);
  self.postMessageToChannel(channel.name, "Retourne travailler sale stagiaire !", {as_user: true});
};

Cardibot.prototype._isSachaSpeaking = function (message) {
  return message.user == "U0M2Z0B2N";
};

Cardibot.prototype._replySachaSpeaking = function (message) {
  var self = this;
  var channel = self._getChannelById(message.channel);

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      self.postMessageToChannel(channel.name, JSON.parse(xhttp.responseText).value.joke, {as_user: true});
    }
  };
  xhttp.open("GET", "http://api.icndb.com/jokes/random?firstName=Sacha&lastName=", true);
  xhttp.send();
};

Cardibot.prototype._getChannelById = function (channelId) {
  return this.channels.filter(function (item) {
    return item.id === channelId;
  })[0];
};

module.exports = Cardibot;

//victor = U0M2ZCL6T
//alexandre = U0M30CPEJ
//hermance = U0M39GS4V
//abensimon = U0PLYKW9E
//raphael = U0M2X0W3V
//harold = U0M307X16
//sacha = U0M2Z0B2N
