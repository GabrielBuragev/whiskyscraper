var request = require('request');
var cheerio = require('cheerio');
var simpleCount = 0;
var mailer = require('./mailer.js');
var fs = require('fs');
var productState = [];
var productName = [];

var newProductFlag = false;
var stateProductFlag = false;

var whiskyFr = {
    url: "http://www.whisky.fr/en/selections/new-arrivals.html"
};
module.exports = {
    setupWhiskyFr: function() {

        request(whiskyFr.url, function(error, response, body) {
            if (error) {
                return console.error(error);
            }
            $ = cheerio.load(body);
            var presentProductNames = $('#products-list > li > div > div > div.product-primary > h2 > a');
            var presentProductStates = $("#products-list > li > div.product-shop > div > div:nth-child(3) > p.availability > span");

            for (var J = 0; J < presentProductNames.length; J++) {
                productName[J] = $(presentProductNames[J]).html().trim().replace('&#xA0;', ' ');
            }
            for (var J = 0; J < presentProductStates.length; J++) {
                productState[J] = $(presentProductStates[J]).html().trim();
            }
            // console.log(productName);
            console.log("Setup completed for " + whiskyFr.url + "\nWill be sending requests every 5 minute and check for webpage content changes -- " + whiskyFr.url);
        });
    },
    getWhiskyFr: function() {

        request(whiskyFr.url, function(err, response, body) {
            if (err) {
                return console.error(err);
            }
            newProductFlag = false;
            stateProductFlag = false;

            $ = cheerio.load(body);
            var presentProductNames = $('#products-list > li > div > div > div.product-primary > h2 > a');
            var presentProductStates = $("#products-list > li > div.product-shop > div > div:nth-child(3) > p.availability > span");

            var firstPresentProductName = $('#products-list > li:first-child > div > div > div.product-primary > h2 > a').html().trim().replace('&#xA0;', ' ');
            var appendableProducts = '';
            var appendableStatesOfProducts = [];
            var i = 0;


            for (var I = 0; I < presentProductNames.length; I++) {
                if (productName[i] !== $(presentProductNames[I]).html().trim().replace('&#xA0;', ' ')) {
                    if ($(presentProductNames[I]).html().trim().replace('&#xA0;', ' ') != productName[0]) {
                        appendableProducts += (I + 1) + '. ' + $(presentProductNames[I]).html().trim().replace('&#xA0;', ' ') + '<br>';
                        if (!newProductFlag) newProductFlag = true;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            i = 0;
            for (var J = 0; J < presentProductStates.length; J++) {
                if (newProductFlag) {
                    // fs.appendFile('logging2.txt',J+'. '+productName[i]+' == '+$(presentProductNames[J]).html().trim().replace("&#xA0;"," ")+' ???!\r\n');
                    if (productName[i] == $(presentProductNames[J]).html().trim().replace("&#xA0;", ' ')) {
                        if ((!productState[i].includes('In stock')) && $(presentProductStates[J]).html().includes('In stock')) {
                            var obj = {
                                productState: 'In stock',
                                productName: productName[i]
                            };
                            appendableStatesOfProducts.push(obj);
                            if (!stateProductFlag) stateProductFlag = true;
                            i++;
                        }
                    }
                } else {

                    if ((!productState[J].includes('In stock')) && $(presentProductStates[J]).html().includes('In stock')) {
                        var obj = {
                            productState: 'In stock',
                            productName: productName[J]
                        };
                        appendableStatesOfProducts.push(obj);
                        if (!stateProductFlag) stateProductFlag = true;

                    }

                }
            }


            // If there is a new product on the page first send a mail for the list of the new products 
            if (newProductFlag) {

                var html = "<b>There is a brand new delivery on the webpage go check it !<b>  <br> " + appendableProducts;
                var subject = "There is a brand new delivery on the webpage " + whiskyFr.url;
                mailer.sendMail(whiskyFr.url, subject, html);
                for (var I = 0; I < presentProductNames.length; I++) {
                    productName[I] = $(presentProductNames[I]).html().trim().replace('&#xA0;', ' ');

                }

                // If there are also new product states then send a mail for the list of updated products
                if (stateProductFlag) {
                    var html = "<b> There is a product availability change on the webpage.<b>  The name of the products are: <br> ";
                    var subject = "There is a product availability change on the webpage " + whiskyFr.url;
                    var appendableHtml = '';
                    for (var j = 0; j < appendableStatesOfProducts.length; j++) {
                        appendableHtml += (j + 1) + ". " + appendableStatesOfProducts[j].productName + ' , availability ' + appendableStatesOfProducts[j].productState + ' \n';
                    }
                    html += appendableHtml;
                    mailer.sendMail(whiskyFr.url, subject, html);
                    for (var J = 0; J < presentProductStates.length; J++) {
                        productState[J] = $(presentProductStates[J]).html().trim();

                    }
                } else {
                    for (var J = 0; J < presentProductStates.length; J++) {
                        productState[J] = $(presentProductStates[J]).html().trim();
                    }
                }
                return;

            } else if (stateProductFlag) {
                var appendableHtml = '<b> There is a product availability change on the webpage.<b>  The name of the products are: <br> ';
                for (var j = 0; j < appendableStatesOfProducts.length; j++) {
                    appendableHtml += (j + 1) + ". " + appendableStatesOfProducts[j].productName + ' , availability ' + appendableStatesOfProducts[j].productState + ' <br>';
                }

                var html = appendableHtml;
                var subject = "There is a product availability chagnge on the webpage " + whiskyFr.url;
                mailer.sendMail(whiskyFr.url, subject, html);

                for (var J = 0; J < presentProductStates.length; J++) {
                    productState[J] = $(presentProductStates[J]).html().trim();
                }
                return;
            } else
                console.log("There was no change in the content of the webpage " + whiskyFr.url);
        });

    }
};