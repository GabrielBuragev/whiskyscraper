var rq = require('request');
var cheerio = require('cheerio');
var logger = require("./logger")('WhiskyDE');
var mailer = require("./mailer");

var WhiskyDe = function() {
    this.url = "http://www.whisky.de/shop/Aktuell/Neue-Artikel/?_artperpage=30&pgNr=0&cl=alist&searchparam=&cnid=a71d11a1e1d0d662ae765ad05ea427c0";
    this.baseUrl = "http://www.whisky.de";

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
                            logger.ERR("WhiskyDe scrape didn't start up correctly ! -- initScript Products.length");
                        } else {
                            setInterval(checkChanges, 300000);
                            logger.OK("WhiskyDe scrape initialized successfully");

                        }

                    }
                }
            )
    }

    var getProductRows = function(body) {
        var $ = cheerio.load(body);
        //
        var tmpProducts = [];
        $("div#productList div.panel.article-panel").each(function() {
            var product = {};
            var articleThumbnail = $(this).find("div.article-thumbnail");
            var articleRight = $(this).find("div.article-right");
            product.url = articleThumbnail.find("a").attr('href');
            product.img = articleThumbnail.find("a img").attr('src');
            product.name = articleRight.find("div.article-title a").text();
            product.attributes = articleRight.find("div.article-attributes ").html();
            product.description = articleRight.find("div.article-description").html();
            product.more_info = articleRight.find("div.article-more").html();
            product.amount = articleRight.find("div.article-amount").html();
            product.price = articleRight.find("div.article-price span.article-price-default").text();
            product.delivery = articleRight.find("div.delivery div.article-delivery-info").html();
            product.available = articleRight.find("div.article-stock span").text();


            if (product.price == "") {
                product.price = "N/A";
            }


            tmpProducts.push(product);
        });

        return tmpProducts;

    };

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

                                    for (i; i < tmpProducts.length; i++) {
                                        if (Products[i].name == tmpProducts[i].name && Products[i].available != tmpProducts[i].available) {
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
                                        if (Products[i].name == tmpProducts[i].name && Products[i].available != tmpProducts[i].available) {
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
                            logger.WARN("No products on page www.whisky.de ! [tmpProducts.length = 0]");
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


    //Please rename this function !
    var parseToHtmlMail = function(newProducts) {
        var changesMessage = "<table border='1' style='border-collapse:collapse;'>";
        newProducts.forEach(function(e, i) {
            changesMessage +=
                "<tr>" +
                "<td>" +
                "<a href='" + (e.url.includes("http") ? e.url : (self.baseUrl + e.url)) + "'><img src='http://www.placehold.it/120x120.jpg' width='120px'  height='120px'></a>" +
                "</td>" +
                "<td>" +
                "<h3><a href='" + (e.url.includes("http:") ? e.url : (self.baseUrl + e.url)) + "'>" + e.name + "</a></h3>" +
                "<span>" + e.attributes + "</span><br>" +
                "<span>" + e.description + "</span><br>" +
                "<span>" + e.more_info + "</span>" +
                "<h4>" + e.amount + "</h4>" +
                "<h2>" + e.price + "</h2>" +
                "<span>" + e.delivery + "</span><br>" +
                "<span>" + e.available + "</span><br>" +
                "</td>  " +
                "</tr>";


        });
        changesMessage += "</table>";
        return changesMessage;
    };


    var self = this;
    self.initScript();
}
module.exports = new WhiskyDe();