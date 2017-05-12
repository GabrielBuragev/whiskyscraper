/*
    All rights reserved
    Author : Gabriel Buragev - gabco96[at]hotmail.com
	https://github.com/GabrielBuragev || https://www.facebook.com/gabriel.buragev
*/


var express = require('express');
var app = express();

//check



//Api connectors
var whiskyExchangeApi = require('./mods/whiskyex.js');
var maltApi = require('./mods/malt.js');
var whiskyFr = require('./mods/whiskyfr.js');
function setupScript() {
    console.log("Setting up script");

    maltApi.getTheMasterOfMalt();
    whiskyExchangeApi.getTheWhiskyExchange();
    whiskyFr.setupWhiskyFr();
    setInterval(maltApi.getTheMasterOfMalt, 300000);
    setInterval(whiskyExchangeApi.getTheWhiskyExchange, 300000);
    setInterval(whiskyFr.getWhiskyFr, 300000);
}

app.get('/', function(req, res) {
    res.send('<h2>Some cool automated script running over here</h2>');

});
app.listen(process.env.PORT || 5000, function() {
    console.log("Server listening on localhost:8080");
    setupScript();
});