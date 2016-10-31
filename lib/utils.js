var Utils = function() {

    this._isChatMessage = function(message) {
        return message.type === "message" && Boolean(message.text);
    };

    this._isChannelConversation = function(message) {
        return typeof message.channel === "string" &&
            message.channel[0] === "C";
    };

    this._isDirectMessage = function(message) {
        return typeof message.channel === "string" &&
            message.channel[0] === "D";
    };

    this._isMessageOk = function(message, cardibot) {
        return this._isChatMessage(message) && !this._isFromCardibot(message, cardibot);
    };

    this._isFromCardibot = function(message, cardibot) {
        return message.user === cardibot.user.id;
    };

    this._getChannelOrUser = function(message, cardibot) {
        var self = this;
        if (self._isChannelConversation(message)) {
            return cardibot.channels.filter(function(item) {
                return item.id === message.channel;
            })[0];
        } else if (self._isDirectMessage(message)) {
            return cardibot.users.filter(function(item) {
                return item.id === message.user;
            })[0];
        }
    };

    this._randomIntFromInterval = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

};

module.exports = Utils;
