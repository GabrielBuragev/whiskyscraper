var rq = require('request');
var mailer = require("./mailer");
var cheerio = require('cheerio');
var logger = require('./logger')('Nickollsandperks');
var NickollSandperks = function() {
    this.url = "https://www.nickollsandperks.co.uk/browse.asp?category=243&flt_style=13974&pagesize=50";
    this.baseUrl = "https://www.nickollsandperks.co.uk";
    this.inStockLabel = "In Stock - available for immediate delivery ";
    var Products = [];
    var initScript = function() {
        rq
            .get(self.url,
                function(err, res, body) {
                    if (err) {
                        logger.ERR(err);
                        return err;
                    } else if (body) {
                        Products = getProductRows(body);
                        if (Products.length > 0) {
                            setInterval(self.checkChanges, 300000);
                            logger.OK("NickollSandPerks scrape initialized successfully");
                        } else {
                            logger.WARN("NickollSandPerks scrape failed to initialize, probably due to design changes !");
                        }
                    }
                });

    };

    var getProductRows = function(body) {
        var $ = cheerio.load(body);
        var tmpProducts = [];
        $("div#productbrowseblock div.product").each(function() {
            var product = {};
            var topSection = $(this).find('div.rhs div.topsection ');
            var bottomSection = $(this).find("div.rhs div.bottomsection");
            product.img = $(this).find('div.lhs img').attr('src');
            product.name = topSection.find('div.name a').text();
            product.link = topSection.find('div.name a ').attr('href');
            product.size = topSection.find("div.size").text();
            product.location = topSection.find('div.location').text();
            product.delivery = topSection.find('div.delivery span.header').text() + topSection.find("div.delivery span.value").text();
            product.price = bottomSection.find('div.prices span.header').text() + bottomSection.find('div.prices span.primaryprice').text();
            product.available = bottomSection.find('div.stock').text();
            tmpProducts.push(product);
        });
        return tmpProducts;
    };

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
                                        if (Products[i].name == tmpProducts[i].name && Products[i].price != tmpProducts[i].price) {
                                            hasAvailabilityChanges = true;
                                            Products[i].price = tmpProducts[i].price;
                                            Products[i].available = tmpProducts[i].available;
                                            availabilityChanges.push(tmpProducts[i]);
                                        }
                                    }
                                    for (i = 0; i < newProducts.length; i++) {
                                        Products.splice(i, 0, newProducts[i]);
                                        Products.pop();
                                    }
                                    hasNewProducts = true;
                                } else {
                                    for (var i = 0; i < tmpProducts.length; i++) {
                                        if (Products[i].name == tmpProducts[i].name && Products[i].price != tmpProducts[i].price) {
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
                            logger.WARN("No products on page www.nickollsandperks.com ! [tmpProducts.length = 0]");
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
                })
    }

    var parseToHtmlMail = function(newProducts) {
        var changesMessage = "<table border='1' style='border-collapse:collapse;'>";


        for (var i = 0; i < newProducts.length; i++) {
            changesMessage += "<tr>" +
                "<td> <a href='" + (self.baseUrl) + newProducts[i].link + "'><img src='" + (self.baseUrl) + newProducts[i].img + "'> </a></td>" +
                "<td>" +
                "<div class='product-info'>" +
                " <h3>" + newProducts[i].name + "</h3>" +
                "<span><b>" + newProducts[i].size + "</b></span><br>" +
                "<span>" + newProducts[i].location + "</span><br>" +
                "<span>" + newProducts[i].delivery + "</span><hr>" +
                "<span> " + newProducts[i].price + "</span><br>" +
                "<span>" + newProducts[i].available + "</span><br><hr>" +
                "</div>"
            "</td>" +

            "</tr>";
        }
        changesMessage += "</table>";
        return changesMessage;
    }
    var self = this;

    initScript();
}
module.exports = new NickollSandperks();