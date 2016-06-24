var UtilsR = require("./utils.js");
var Utils = new UtilsR();

var restau = [
    "Mongoo", "Label",
    "Toto pizza", "Toto pates",
    "Coréen", "Bagel", "Pegast", "Corse",
    "Jap",
    "Domac", "Sub", "BK",
    "Burgers hipster-bio"
    ];

var Manger = function () {
    this._isMentioningManger = function (message) {
        return message.text.toLowerCase().indexOf("!manger") > -1;
    };

    this._replyManger = function (message, cardibot) {
        var self = this;
        var channelName;
        if (message == null) {
            channelName = "general";
        } else {
            channelName = Utils._getChannelOrUser(message, cardibot).name;
        }
        var res = Math.trunc(Math.random() * restau.length);
        cardibot.postTo(channelName, "Aujourd'hui vous allez manger " + restau[res] +
            ". Bon appétit à tous !", {as_user: true});
    };

    this._isMentioningMangerListe = function (message) {
        return message.text.toLowerCase().indexOf("!mangerliste") > -1;
    };

    this._replyMangerListe = function (message, cardibot) {
        var channel = Utils._getChannelOrUser(message, cardibot);
        var res = "Y a quand même le choix :\n";
        for (var i = 0; i < restau.length; i++) {
            res += "\t- " + restau[i] + "\n";
        }
        cardibot.postTo(channel.name, res, {as_user: true});
    }
};

module.exports = Manger;

// TODO: Mettre la liste des options de bouffe dans une table dans la BDD
