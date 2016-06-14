_isChatMessage = function (message) {
  return message.type === "message" && Boolean(message.text);
};

_isChannelConversation = function (message) {
  return typeof message.channel === "string" &&
  message.channel[0] === "C";
};

_isDirectMessage = function (message) {
  return typeof message.channel === "string" &&
  message.channel[0] === "D";
};

_isFromCardibot = function (message) {
  return message.user === this.user.id;
};

_isMessageOk = function (message) {
  return this._isChatMessage(message) && !this._isFromCardibot(message);
};

_getChannelOrUser = function (message) {
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

_randomIntFromInterval = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
};
