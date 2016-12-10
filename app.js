/*
    All rights reserved
    Author : Gabriel Buragev - gabco96[at]hotmail.com
	https://github.com/GabrielBuragev || https://www.facebook.com/gabriel.buragev
*/


var express = require('express');
var app = express();


//Api connectors
var whiskyExchangeApi = require('./mods/whiskyex.js');
var maltApi = require('./mods/malt.js');
var whiskyFr = require('./mods/whiskyfr.js');
function setupScript(){
	console.log("Setting up script");
	maltApi.getTheMasterOfMalt();
	whiskyExchangeApi.getTheWhiskyExchange();
	whiskyFr.setupWhiskyFr();
	setInterval(maltApi.getTheMasterOfMalt,2500);
	setInterval(whiskyExchangeApi.getTheWhiskyExchange,2500);
	setInterval(whiskyFr.getWhiskyFr,2500);
}

app.listen(8080,function(){
	console.log("Server listening on localhost:8081");
	setupScript();
});