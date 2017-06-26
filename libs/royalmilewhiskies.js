var rq = require('request');
var cheerio = require('cheerio');
var logger = require("./logger");
var mailer = require("./mailer");

var RoyalMileWhiskies = function() {
    this.url = "http://www.royalmilewhiskies.com/new-products/?limit=36";
    this.baseUrl = "https://www.royalmilewhiskies.com";

    var Products = [];
    this.initScript = function() {
        rq
            .get(self.url, function(err, res, body) {
                if (err) {
                    logger.ERR(err);
                    return err;
                } else if (body) {
                    Products = getProductRows(body);
                    setInterval(checkChanges, 300000);
                    logger.OK("RoyalMileWhiskies scrape initialized successfully");
                }
            });
    }

    var getProductRows = function(body) {
        var $ = cheerio.load(body);
        var tmpProducts = [];
        $("ul.products-grid li.item").each(function() {
            var product = {};
            product.url = $(this).find('a.product-image').attr('href');
            product.img = $(this).find('a.product-image img').attr('src');
            product.name = $(this).find("div.product-info h2.product-name a").text();
            product.subtitle = $(this).find("div.product-info h3.product-sub-title").text();
            product.price = $(this).find('div.product-info div.vatAndPrice span.price').text();
            product.vat_label = $(this).find("div.product-info div.vatAndPrice span.vat-label").text();
            tmpProducts.push(product);
        });
        return tmpProducts;
    }

    var checkChanges = function() {
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

                                    /**
                                     * No availability information on page !
                                     */
                                    // for (i; i < tmpProducts.length; i++) {
                                    //     if (Products[i].name == tmpProducts[i].name && Products[i].available != tmpProducts[i].available && Products[i].available == self.outOfStockLabel) {
                                    //         hasAvailabilityChanges = true;
                                    //         Products[i].price = tmpProducts[i].price;
                                    //         Products[i].available = tmpProducts[i].available;
                                    //         availabilityChanges.push(tmpProducts[i]);
                                    //     }
                                    // }
                                    for (i = 0; i < newProducts.length; i++) {
                                        Products.splice(i, 0, newProducts[i]);
                                        Products.pop();
                                    }
                                    hasNewProducts = true;
                                } else {
                                    /**
                                     * No availability information on page !
                                     */
                                    // for (var i = 0; i < tmpProducts.length; i++) {
                                    //     if (Products[i].name == tmpProducts[i].name && Products[i].available != tmpProducts[i].available && Products[i].available == self.outOfStockLabel) {
                                    //         hasAvailabilityChanges = true;
                                    //         Products[i].price = tmpProducts[i].price;
                                    //         Products[i].available = tmpProducts[i].available;
                                    //         availabilityChanges.push(tmpProducts[i]);
                                    //     }
                                    // }
                                }
                            } else {
                                for (var i = 0; i < tmpProducts.length; i++) {
                                    Products[i] = tmpProducts[i];
                                    newProducts.push(tmpProducts[i]);
                                    hasNewProducts = true;
                                }
                            }

                        } else {
                            logger.WARN("No products on page www.royalmilewhiskies.com ! [tmpProducts.length = 0]");
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
    }

    var parseToHtmlMail = function(newProducts) {
        var changesMessage = "<table border='1' style='border-collapse:collapse;'>";
        newProducts.forEach(function(e, i) {
            changesMessage +=
                "<tr >" +
                "<td>" +
                "<a href='" + (e.url.includes("http") ? e.url : (self.baseUrl + e.url)) + "'><img src='" + e.img + "' width='120px'  height='120px'></a> <hr>" +
                "</td>" +
                "<td>" +
                "<h3><a href='" + (e.url.includes("http:") ? e.url : (self.baseUrl + e.url)) + "'>" + e.name + "</a></h3>" +
                "<span>" + e.subtitle + "</span><br>" +
                "<span>" + e.price + (" ") + e.vat_label + "</span>" +
                "</td>  " +
                "</tr>";


        });
        changesMessage += "</table>";
        return changesMessage;
    }

    var self = this;
    self.initScript();
}

module.exports = new RoyalMileWhiskies();