'use strict';

var Cardibot = require('../lib/cardibot');

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var cardibot = new Cardibot({
    token: token,
    dbPath: dbPath,
    name: name
});

cardibot.run();
