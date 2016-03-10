'use strict';

var path = require('path');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");

var file = "cardibot.db";
var exists = fs.existsSync(file);

var db = new sqlite3.Database(file);

db.serialize(function() {
  if(!exists) {
    db.run('CREATE TABLE jdh (id TEXT PRIMARY KEY, score TEXT, temps TEXT)';
  }
});
