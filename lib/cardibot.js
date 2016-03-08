'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var Bot = require('slackbots');

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

    if (this._isMentioningManger(message)) {
      this._replyManger(message);
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
  return this._isChatMessage && this._isChannelConversation(message) &&
  !this._isFromCardibot(message));
}

Cardibot.prototype._isMentioningBot = function (message) {
  return message.text.toLowerCase().indexOf('bot') > -1 ||
  message.text.toLowerCase().indexOf(this.name) > -1;
};

Cardibot.prototype._replyBasic = function (originalMessage) {
  var self = this;
  var channel = self._getChannelById(originalMessage.channel);
  self.postMessageToChannel(channel.name, "C'est moi !", {as_user: true});
};

Cardibot.prototype._isMentioningManger = function (message) {
  return message.text.toLowerCase().indexOf('!manger') > -1;
};

Cardibot.prototype._replyManger = function (originalMessage) {
  var self = this;
  var channel = self._getChannelById(originalMessage.channel);
  var restau = ["Corse", "Subway", "Mongoo", "Pizza", "Japonais",
    "Japonais jusqu'à 15 heures", "MACDO", "Pegast", "les burgers Hipster bio", "Bagel",
    "Toto pizza", "Goutu (les sandwich entre 1 et 3e)", "un nouveau resto tu testeras"];
  var res = Math.trunc(Math.random() * restau.length);
  self.postMessageToChannel(channel.name, "Aujourd'hui vous allez manger " + restau[res] +
    ". Bon appétit à tous !", {as_user: true});
};

Cardibot.prototype._getChannelById = function (channelId) {
  return this.channels.filter(function (item) {
    return item.id === channelId;
  })[0];
};

module.exports = Cardibot;
