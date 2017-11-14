var cheerio = require('cheerio');
var rq = require('request');
var mailer = require("./mailer");
var logger = require("./logger");
var LionsWhisky = function() {
    this.baseUrl = "http://www.lionswhisky.com";
    this.page_one = "new_arrivals.php";
    this.url = "http://www.lionswhisky.com/new_arrivals.php";
    this.outOfStockLabel = "OUT OF STOCK";
    this.inStockLabel = "Price: ";
    this.numProductsOnInit = 100;
    var PagLinks = [];
    var Products = [];

    var initScript = function() {
        rq.post(self.url, { form: { num_pag: self.numProductsOnInit } },
            function(err, res, body) {
                if (err) {
                    logger.ERR(err);
                    return err;
                } else if (body) {
                    Products = getProductRows(body);
                    if (Products.length > 0) {
                        setInterval(self.checkChanges, 300000);
                        logger.OK('LionsWhisky scrape initialized successfully');
                    } else {
                        logger.WARN("LionsWhisky scrape failed to initialize, probably due to design changes !");
                    }
                }
            });

    };

    var getProductRows = function(body) {
        var $ = cheerio.load(body);
        var tmpProducts = [];
        $("div.product-list table tbody tr").each(function(i) {
            if (i == 0)
                return;
            var product = {};
            product.name = $(this).find('td.name a').text();
            product.url = $(this).find("td.name a").attr('href');
            product.img = $(this).find('td img.image').attr('src');
            product.price = $(this).find('td.price').text();
            product.available = (product.price == self.outOfStockLabel) ? (false) : (true);
            tmpProducts.push(product);
        });
        return tmpProducts;
    };

    var getPagLinks = function(body) {
        var $ = cheerio.load(body);
        var tmpPagLinks = [];
        tmpPagLinks.push(self.page_one);

        $("div.product-list table tbody tr").eq(0).find('a.pag_link').each(function() {
            tmpPagLinks.push($(this).attr('href'));
        });
        return tmpPagLinks;
    };

    this.checkChanges = function() {

        rq.post(self.url, { form: { num_pag: self.numProductsOnInit } },
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
                                    if (Products[i].name == tmpProducts[i].name && Products[i].price != tmpProducts[i].price && Products[i].price == self.outOfStockLabel) {
                                        hasAvailabilityChanges = true;
                                        Products[i].price = tmpProducts[i].price;
                                        Products[i].available = true;
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
                                    if (Products[i].name == tmpProducts[i].name && Products[i].price != tmpProducts[i].price && Products[i].price == self.outOfStockLabel) {
                                        hasAvailabilityChanges = true;
                                        Products[i].price = tmpProducts[i].price;
                                        Products[i].available = true;
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
                        logger.WARN("No products on page www.lionswhisky.com ! [tmpProducts.length = 0]");
                        return;
                    }


                    if (hasNewProducts) {
                        changesMessage += "<h1>New products on page " + self.baseUrl + " : </h1><br>";
                        changesMessage += parseToHtmlMail(newProducts);
                    }
                    if (hasAvailabilityChanges) {
                        changesMessage += "<h1>Products that came available to buy : </h1><br>";
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


        for (var i = 0; i < newProducts.length; i++) {
            changesMessage += "<tr>" +
                "<td> <a href='" + newProducts[i].url + "'><img src='" + newProducts[i].img + "' width='120px' height='120px'> </a></td>" +
                "<td>" +
                "<div class='product-info'>" +
                " <h3><a href='" + newProducts[i].url + "'>" + newProducts[i].name + "</a></h3>" +
                "<span> " + newProducts[i].price + "</span><br>" +
                "<span>" + ((newProducts[i].available) ? ("In Stock") : ("Out of Stock")) + "</span><br><hr>" +
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

module.exports = new LionsWhisky();