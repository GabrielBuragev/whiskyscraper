/*
 *   Author : Gabriel Buragev - gabco96[at]hotmail.com
 */

require('dotenv').config();
var express = require('express');
var https = require('https');
var app = express();

var whiskyExchange = require('./libs/whiskyex.js');
var Malt = require('./libs/malt.js');
var whiskyFr = require('./libs/whiskyfr.js');
var LionsWhisky = require('./libs/lionsWhisky/Scraper');
var NickollSandPerks = require('./libs/nickollsandperks');
// TODO: Heal this script
var VinMonopolet = require('./libs/vinmonopolet');
var oldWhisky = require('./libs/oldWhisky/Scraper');

// DDOS PROTECTED SITES
// var RoyalMileWhiskies = require("./libs/royalmileWhisky/Scraper");

// DISABLED
// var WhiskyDe = require('./libs/whisky.de');

function setupScript() {
    console.log("Setting up script");

    Malt.getTheMasterOfMalt();
    whiskyExchange.getTheWhiskyExchange();
    whiskyFr.setupWhiskyFr();
    setInterval(Malt.getTheMasterOfMalt, 300000);
    setInterval(whiskyExchange.getTheWhiskyExchange, 300000);
    setInterval(whiskyFr.getWhiskyFr, 300000);
}

function testMailer() {
    var mailer = require('./libs/mailer.js');
    mailer.testMailFunction();
}
testMailer();


// Loopback request to prevent app sleeping!
var doLbRequest = function() {
    https.get('https://whiskyscraper.herokuapp.com/', function(res) {
        var rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                console.log("RESPONE FROM LOOPBACK REQUEST : " + rawData);
            } catch (e) {
                console.error(e.message);
            }
        });
    });
}
setInterval(function() {
    doLbRequest();
}, 300000); // every 5 minutes (300000)
doLbRequest();
//  -   -   -   -

app.get('/', function(req, res) {
    res.send('<h2>Some cool automated script running over here</h2>');

});
var server = app.listen(process.env.PORT || 5000, function() {
    console.log("Server listening on localhost:" + server.address().port);
    setupScript();
});