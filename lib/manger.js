_isMentioningManger = function (message) {
  return message.text.toLowerCase().indexOf("!manger") > -1;
};

_replyManger = function (message) {
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
  "Toto pates", "Goutu", "un nouveau resto tu testeras", "Korean"];
  var res = Math.trunc(Math.random() * restau.length);
  self.postTo(channel.name, "Aujourd'hui vous allez manger " + restau[res] +
  ". Bon appétit à tous !", {as_user: true});
};

// TODO: Rajouter options bouffe et faire fonction qui affiche toutes les options
