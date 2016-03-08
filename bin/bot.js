#!/usr/bin/env node

'use strict';

var Cardibot = require('../lib/cardibot');

var token = process.env.BOT_API_KEY;
var name = process.env.BOT_NAME;

var cardibot = new Cardibot({
    token: token,
    name: name
});

cardibot.run();
