var cheerio = require("cheerio");
var rq = require('request');
var mailer = require('./mailer');
var logger = require("./logger");

var Vinmonopolet = function() {
    this.url = "https://www.vinmonopolet.no/search?q=%3Arelevance%3AvisibleInSearch%3Atrue%3ANewProducts%3Atrue%3AmainCategory%3Abrennevin%3AmainSubCategory%3Abrennevin_whisky&searchType=product";
    this.baseUrl = "https://www.vinmonopolet.no/";
    this.outOfStockLabel = "Utsolgt fra leverandør";
    var Products = [];
    this.initScript = function() {
        rq
            .get(self.url,
                function(err, res, body) {
                    if (err) {
                        logger.ERR(err);
                        return err;
                    } else if (body) {
                        Products = getProductRows(body);
                        if (Products.length < 1) {
                            setInterval(self.checkChanges, 300000);
                            logger.WARN("Vinmonopolet scrape started with 0 products ! -- initScript Products.length");
                        } else {
                            setInterval(self.checkChanges, 300000);
                            logger.OK("Vinmonopolet scrape initialized successfully");
                        }
                    }
                });


    }

    var getProductRows = function(body) {
        var $ = cheerio.load(body);
        var tmpProducts = [];
        $("ul.product-list li.product-item").each(
            function() {
                var product = {};
                var productPriceDom = $(this).find('div.product-item__price');
                product.name = $(this).find("h2.product-item__name a ").text();
                product.url = $(this).find('h2.product-item__name a ').attr('href');
                product.item_summary = $(this).find("div.product-item__summary").text();
                product.img = $(this).find("div.product-item__image img ").attr('src');
                product.price = productPriceDom.find('span.product-item__price').text();
                product.ammount = productPriceDom.find('span.product-item__amount').text();
                product.cost_per_unit = productPriceDom.find("span.product-item__cost_per_unit").text();
                product.available = $(this).find('div.product-stock-status div').text();
                tmpProducts.push(product);
            }
        );
        return tmpProducts;
        // console.log(.length);
    }
    this.checkChanges = function() {
        rq
            .get(self.url,
                function(err, res, body) {
                    if (err) {
                        logger.ERR(err);
                        return err;

                    } else if (body) {
                        var tmpProducts = getProductRows(body);
                        var hasNewProducts = false;
                        var hasAvailabilityChanges = false;
                        var newProducts = [];
                        var availabilityChanges = [];
                        var changesMessage = "";

                        if (tmpProducts.length > 0) {

                            if (Products.length > 0) {
                                if (Products[0].name != tmpProducts[0].name) {
                                    var i = 0;
                                    while (i < tmpProducts.length && tmpProducts[i].name != Products[0].name) {
                                        newProducts.push(tmpProducts[i]);
                                        i++;
                                    }
                                    for (i; i < tmpProducts.length; i++) {
                                        if (Products[i].name == tmpProducts[i].name && Products[i].available != tmpProducts[i].available && Products[i].available == self.outOfStockLabel) {
                                            hasAvailabilityChanges = true;
                                            Products[i].price = tmpProducts[i].price;
                                            Products[i].available = tmpProducts[i].available;
                                            availabilityChanges.push(tmpProducts[i]);
                                        }
                                    }
                                    for (i = 0; i < newProducts.length; i++) {
                                        Products.splice(i, 0, newProducts[i]);
                                    }
                                    hasNewProducts = true;
                                } else {
                                    for (var i = 0; i < tmpProducts.length; i++) {
                                        if (Products[i].name == tmpProducts[i].name && Products[i].available != tmpProducts[i].available && Products[i].available == self.outOfStockLabel) {
                                            hasAvailabilityChanges = true;
                                            Products[i].price = tmpProducts[i].price;
                                            Products[i].available = tmpProducts[i].available;
                                            availabilityChanges.push(tmpProducts[i]);
                                        }
                                    }
                                }
                            } else {
                                for (var i = 0; i < tmpProducts.length; i++) {
                                    Products[i] = tmpProducts[i];
                                    newProducts.push(tmpProducts[i]);
                                    hasNewProducts = true;
                                }
                            }



                        } else {
                            logger.WARN("No products on page www.vinmonopolet.no ! [tmpProducts.length = 0]");
                            return;
                        }


                        if (hasNewProducts) {
                            changesMessage += "<h1>New products on page " + self.baseUrl + " : </h1> <br>";
                            changesMessage += parseToHtmlMail(newProducts);

                        }
                        if (hasAvailabilityChanges) {
                            changesMessage += "<h1>Products with changed availability : </h1><br>";
                            changesMessage += parseToHtmlMail(availabilityChanges);

                        }

                        if (changesMessage != '') {
                            mailer.sendMail(self.url, "Product changes on : " + self.baseUrl, changesMessage);
                        } else {
                            logger.NORMAL("There were no changes on the page " + self.baseUrl + " !");
                        }
                    }
                });
    };
    var parseToHtmlMail = function(newProducts) {
        var changesMessage = "<table border='1' style='border-collapse:collapse;'>";
        newProducts.forEach(function(e, i) {
            changesMessage +=
                "<tr>" +
                "<td>" +
                "<a href='" + (self.baseUrl + e.url) + "'><img src='" + e.img + "' width='120px'  height='120px'></a>" +
                "</td>" +
                "<td>" +
                "<h3><a href='" + (self.baseUrl + e.url) + "'>" + e.name + "</a></h3>" +
                "<span>" + e.item_summary + "</span><br>" +
                "<span>" + e.price + (" ") + e.ammount + "</span><br>" +
                "<span>" + e.cost_per_unit + "</span><br>" +
                "<span>" + e.available + "</span><hr>" +
                "</td>" +
                "</tr>";


        });
        changesMessage += "</table>";
        return changesMessage;

    };



    var self = this;
    self.initScript();
}

module.exports = new Vinmonopolet();