var UtilsR = require("./utils.js");

var Utils = new UtilsR();

var Manger = function() {
  this._isMentioningManger = function (message) {
    return message.text.toLowerCase().indexOf("!manger") > -1;
  };

  this._replyManger = function (message, cardibot) {
    var self = this;
    var channel;
    if (message == null) {
      // Dans channel general
      channel = cardibot.channels[0];
    } else {
      channel = Utils._getChannelOrUser(message, cardibot);
    }
    var restau = ["Corse", "Sub", "Mongoo", "Jap", "Jap jusqu'à 15 heures",
    "Domac", "Pegast", "les burgers Hipster bio", "Bagel", "Toto pizza", "BK ma gueule",
    "Toto pates", "Goutu", "un nouveau resto tu testeras", "Korean"];
    var res = Math.trunc(Math.random() * restau.length);
    cardibot.postTo(channel.name, "Aujourd'hui vous allez manger " + restau[res] +
    ". Bon appétit à tous !", {as_user: true});
  };
};

module.exports = Manger;

// TODO: Rajouter options bouffe et faire fonction qui affiche toutes les options
