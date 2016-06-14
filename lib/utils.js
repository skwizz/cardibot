var Utils = function() {
  this._isChatMessage = function (message) {
    return message.type === "message" && Boolean(message.text);
  };

  this._isChannelConversation = function (message) {
    return typeof message.channel === "string" &&
    message.channel[0] === "C";
  };

  this._isDirectMessage = function (message) {
    return typeof message.channel === "string" &&
    message.channel[0] === "D";
  };

  this._isFromCardibot = function (message) {
    return message.user === this.user.id;
  };

  this._isMessageOk = function (message) {
    return this._isChatMessage(message) && !this._isFromCardibot(message);
  };

  this._getChannelOrUser = function (message) {
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

  this._randomIntFromInterval = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };
}

module.exports = Utils;
