var express = require('express');
var app = express();
var request = require('request');
// var requestify = require('requestify');
var cheerio = require('cheerio');
var mailer = require('./mailer');
var fs = require('fs');
var diff = require('deep-diff').diff;
var maltSemaphore = require('semaphore')(1);
var maltSetup = false;
var MAXLIMIT = 50;
var concurrent = require('semaphore')(1);
var Converter = require('csvtojson').Converter;

//MasterOfMalt website  config 
Date.prototype.getMonthFormatted = function() {
    var month = this.getMonth() + 1;
    return month < 10 ? '0' + month : '' + month; // ('' + month) for string result
}
Date.prototype.getDateFormatted = function() {
    var month = this.getDate();
    return month < 10 ? '0' + month : '' + month; // ('' + month) for string result
}
var masterOfMalt = {
    url: "https://www.masterofmalt.com/new-arrivals/",
    headers: {
        'User-Agent': '*'
    }
};

//Content arrays
var masterOfMaltContent = [];
var newContent = [];

var newProductsFlag = false;
var availabilityFlag = false;

var content;
var flag = true;
var counter = -1;
var maltChanged = false;

module.exports = {
    getTheMasterOfMalt: function() {
        var urlIndex = 0;
        maltChanged = false;
        newProductsFlag = false;
        availabilityFlag = false;
        counter = -1;
        newContent = [];
        var newProductsText = "";
        var availabilityProductsText = "";
        request(masterOfMalt, function(err, response, body) {
            if (!err && response.statusCode == 200) {
                var $ = cheerio.load(body);
                var appendableObj = {};

                $('#productBoxWideContainer').children().each(function(i) {
                    var date = "";

                    if ($(this).hasClass('row')) {
                        appendableObj = {};
                        $(this).find('.calendar-icon').children().each(function(o) {
                            date += (o == 1) ? ($(this).html().trim()) : ($(this).html().trim() + "-");
                        });


                        appendableObj.date = date;
                        appendableObj.products = [];
                        if (flag)
                            masterOfMaltContent.push(appendableObj);
                        else
                            newContent.push(appendableObj);
                        counter++;

                    } else if ($(this).hasClass('product-box-wide')) {
                        var product = {};
                        product.url = $(this).attr('data-product-url');
                        $(this).children().each(function(p) {
                            if ($(this).is('h3')) {
                                product.name = $(this).children().html().trim();
                            } else if ($(this).hasClass('product-box-wide-volume')) {
                                product.volume = $(this).html().trim()
                            } else if ($(this).hasClass('product-box-wide-distillery')) {
                                product.distillery = $(this).html().trim();
                            } else if ($(this).hasClass('product-box-wide-buy-wrapper')) {
                                $(this).children().each(function(c) {
                                    if ($(this).hasClass('product-box-wide-price')) {
                                        product.price = $(this).html().trim();
                                    } else if ($(this).is('a')) {
                                        if ($(this).hasClass('mom-btn-buy-add-to-basket')) {
                                            product.inStock = true;
                                        } else if ($(this).hasClass('mom-btn-buy-out-of-stock')) {
                                            product.inStock = false;
                                        }
                                    }
                                });
                            }
                        });
                        if (flag)
                            masterOfMaltContent[counter].products.push(product);
                        else
                            newContent[counter].products.push(product);
                    }
                });
                if (flag) {
                    flag = false;
                    console.log("Setup completed for " + masterOfMalt.url + "\nWill be sending requests every 5 minutes and check for content changes on " + masterOfMalt.url);
                } else {
                    newContent[0]['products'][0].inStock = false;
                    //If there are new products
                    if (newContent[0]['date'] != masterOfMaltContent[0]['date']) {

                        if (!newProductsFlag)
                            newProductsText = "New products are delivered on the page : <br>";
                        for (var i = 0; i < newContent[0]['products'].length; i++) {
                            newProductsText += "---- " + newContent[0]['products'][i]['name'] + " <br>";
                        }
                        newProductsFlag = true;
                        maltChanged = true;
                    }
                    //Check for availability change
                    var difference = diff(masterOfMaltContent, newContent);
                    if (difference != undefined) {
                        for (var i = 0; i < difference.length; i++) {
                            if (!maltChanged) {
                                maltChanged = true;
                            }
                            if (difference[i].kind == 'E') {
                                if (difference[i].lhs == false && difference[i].rhs == true && difference[i].path[3] == 'inStock') {
                                    var path_1 = difference[i].path[0];
                                    var path_2 = difference[i].path[1];
                                    var path_3 = difference[i].path[2];
                                    var path_4 = difference[i].path[3];
                                    if (!availabilityFlag) {
                                        availabilityProductsText = "Availability change in products , the following products are now in stock : <br>";
                                    }
                                    availabilityProductsText += "---- " + masterOfMaltContent[path_1][path_2][path_3]['name'] + " <br>"
                                    availabilityFlag = true;
                                }
                            }
                        }
                    }
                    if (newProductsFlag) {
                        var subject = "There are new products on " + masterOfMalt.url;
                        mailer.sendMail(masterOfMalt.url, "There are new products on " + subject, newProductsText);
                    }
                    if (availabilityFlag) {
                        var subject = "There was a product availability change on " + masterOfMalt.url;
                        mailer.sendMail(masterOfMalt.url, subject, availabilityProductsText);
                    }
                    if (!newProductsFlag && !availabilityFlag) {
                        console.log('There were no changes in the content of the webpage ' + masterOfMalt.url);
                    }
                    if (maltChanged) {
                        masterOfMaltContent = newContent;
                    }
                }
            } else {
                console.log(err);
                console.log(response.statusCode);
            }
        });


    }
};