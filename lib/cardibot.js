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
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromCardibot(message) &&
        this._isMentioningBot(message)
    ) {
        this._reply(message);
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

Cardibot.prototype._isMentioningBot = function (message) {
    return message.text.toLowerCase().indexOf('bot') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

Cardibot.prototype._reply = function (originalMessage) {
    var self = this;
    var channel = self._getChannelById(originalMessage.channel);
    self.postMessageToChannel(channel.name, "C'est moi !", {as_user: true});
};

Cardibot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = Cardibot;
