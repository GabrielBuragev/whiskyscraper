/*
 *   Author : Gabriel Buragev - gabco96[at]hotmail.com
 */


var express = require('express');
var app = express();

var whiskyExchange = require('./libs/whiskyex.js');
var Malt = require('./libs/malt.js');
var whiskyFr = require('./libs/whiskyfr.js');
var LionsWhisky = require('./libs/lionswhisky');
var NickollSandPerks = require('./libs/nickollsandperks');
var VinMonopolet = require('./libs/vinmonopolet');
var RoyalMileWhiskies = require("./libs/royalmilewhiskies");
var WhiskyDe = require('./libs/whisky.de');

function setupScript() {
    console.log("Setting up script");

    Malt.getTheMasterOfMalt();
    whiskyExchange.getTheWhiskyExchange();
    whiskyFr.setupWhiskyFr();
    setInterval(Malt.getTheMasterOfMalt, 300000);
    setInterval(whiskyExchange.getTheWhiskyExchange, 300000);
    setInterval(whiskyFr.getWhiskyFr, 300000);
}
function testMailer (){
    var mailer = require('./libs/mailer.js');
    mailer.testMailFunction();
}
testMailer();

app.get('/', function(req, res) {
    res.send('<h2>Some cool automated script running over here</h2>');

});
app.listen(process.env.PORT || 5000, function() {
    console.log("Server listening on localhost:8080");
    setupScript();
});