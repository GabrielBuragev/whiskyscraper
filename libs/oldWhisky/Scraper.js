var rq = require('request-promise');
var cheerio = require('cheerio');
var Product = require('./Product');
var mailer = require("../mailer");
var logger = require("../logger");
var Datastore = require('nedb');
var db = new Datastore({ filename: 'db/oldwhiskyProducts.db', autoload: true });

var Scrapy = function() {
    var self = this;
    var initFlag = false;
    var scrapeInterval = 300000;
    var URL = {
        baseURL: 'https://oldwhisky.net',
        newsPath: '/en/news',
        createURL: function() {
            return `${this.baseURL}${this.newsPath}`;
        },
    };

    this._init = function() {
        var self = this;
        this.initDB()
            .then(() => {
                return self.scrape();
            })
            .catch((err) => {
                logger.ERR(err);
            });

    };

    // Count number of documents in db and check if we are initializing for first time
    this.initDB = function() {
        return new Promise((resolve, reject) => {
            db.count({}, (err, n) => {
                if (err)
                    return reject(err);
                if (n == 0)
                    initFlag = true;

                return resolve();
            })
        })
    }
    this.scrape = function() {
        var scrapeURL = URL.createURL();
        return new Promise((resolve, reject) => {
            rq(scrapeURL)
                .then((data) => {
                    parseAndStoreElementsFromHTML(data)
                        .then((reportProducts) => {
                            if (initFlag) {
                                initFlag = false;
                                var msg = `Successfully stored and prepared ${reportProducts.length} products for watching`;
                                logger.OK(msg);
                                return resolve(msg)
                            }
                            if (reportProducts.length > 0) {
                                var updateMessage = generateMailTemplate(reportProducts);
                                mailer.sendMail(URL.createURL(), "Product changes on : " + URL.createURL(), updateMessage);
                                return resolve();
                            } else {
                                logger.OK('Nothing to report, going quiet for a while');
                                return resolve(msg)
                            }
                        })
                        .catch(err => {
                            logger.ERR(err);
                            reject(err);
                        })


                })
                .catch((err) => {
                    logger.ERR(`Failed while scraping ${scrapeURL}!`);
                    logger.ERR(JSON.stringify(err));
                    reject(err);
                })
        })

    }
    var parseAndStoreElementsFromHTML = function(html) {
        const $ = cheerio.load(html);
        var updatedProducts = [];
        var allProducts = [];
        var dateContainers = $('#blushowcase .section-container');

        return new Promise((resolve, reject) => {
            dateContainers.each(function(container, i) {
                var container = $(this);
                var htmlProducts = container.find('li');
                var title = container.find('.title-showcase-page > h3 > span').text();
                var dateAdded = title.split(' - ')[1];

                htmlProducts.each(function() {
                    htmlProduct = $(this);
                    var product = new Product({
                        dateAdded: dateAdded,
                        url: htmlProduct.find('.product_img_link').attr('href'),
                        imgURL: htmlProduct.find('.product_img_link > img').attr('src'),
                        name: htmlProduct.find('.list-part-name .prod-name').text(),
                        price: htmlProduct.find('.content_price .price').text(),
                        available: htmlProduct.find('.content_price .unvisible').text().trim(),
                        additionalInformation: {
                            volume: htmlProduct.find('.data-volume').text(),
                            gradient: htmlProduct.find('.data-gradazione').text(),
                        },
                    });
                    allProducts.push(product);
                    // Storing mechanism
                })
            });

            storeProducts(allProducts)
                .then((updatedProducts) => {
                    resolve(updatedProducts);
                })
                .catch((err) => {
                    reject(err);
                });

        })

    }
    var storeProducts = function(products) {
        var updatedProducts = [];
        var maxI = products.length - 1;
        var processedI = 0;
        // Test
        // if (initFlag) {
        //     var product = new Product({
        //         dateAdded: '1',
        //         url: '1',
        //         imgURL: '1',
        //         name: '1',
        //         price: '1',
        //         available: '1',
        //         additionalInformation: {
        //             volume: '1',
        //             gradient: '1',
        //         },
        //     });
        //     updatedProducts.push({ type: 'new', product: product });
        //     var product2 = new Product({
        //         dateAdded: '1',
        //         url: '1',
        //         imgURL: '1',
        //         name: '1',
        //         price: '2',
        //         available: '0',
        //         additionalInformation: {
        //             volume: '1',
        //             gradient: '1',
        //         },
        //     })
        //     product.update(product2);
        //     updatedProducts.push({ type: 'modified', product: product });
        // }
        return new Promise((resolve, reject) => {
            products.forEach((product, i) => {
                db.find({ _id: product._id }, (err, docs) => {
                    if (err)
                        reject(err);

                    // New product
                    if (docs.length == 0) {
                        db.insert(product.toJSON(), (err, newProduct) => {
                            if (err)
                                reject(err);

                            processedI++;

                            updatedProducts.push({ type: 'new', product: product });

                            if (processedI == maxI) {
                                resolve(updatedProducts);
                            }
                        });
                    }
                    // Existing product -- try update
                    else {
                        // Recreate product from product metadata
                        var productOld = new Product(docs[0]);

                        var updated = productOld.update(product);
                        if (updated)
                            updatedProducts.push({ type: 'modified', product: product });

                        db.update({ _id: productOld._id }, productOld.toJSON(), {}, (err, numReplaced) => {
                            if (err)
                                reject(err);

                            if (numReplaced.length == 0)
                                reject(`Failed to update product with hash :\t${productOld.hash}`);

                            processedI++;

                            if (processedI == maxI) {
                                db.persistence.compactDatafile();
                                resolve(updatedProducts);
                            }
                        })
                    }
                });

            });
        })

    }
    var generateMailTemplate = function(reports) {
        var template = `
            <h1> Changes available on ${URL.createURL()} </h1>
            <table border='1' style='border-collapse:collapse;'>
            
        `;
        var newProducts = "";
        var modifiedProducts = "";
        reports.forEach(function(report, i) {
            var product = report.product;
            var type = report.type;
            var productReport =
                "<tr>" +
                "<td>" +
                `<a href="${product.url}"><img src="${product.imgURL}" width='120px'  height='120px'></a>` +
                "</td>" +
                "<td>" +
                `<h3><a href='${product.url}'>${product.name}</a></h3>` +
                `<span>${product.price}</span><br>` +
                // `<span>${product.additionalInformation.gradient} / ${product.additionalInformation.volume}</span>` +
                `<span>${product.available}</span><br>` +
                "</td>  " +
                "</tr>";
            if (type == 'new')
                newProducts += productReport;
            if (type == 'modified')
                modifiedProducts += productReport;
        });

        if (newProducts != "") {
            template += `
                <tr>
                <td>
                New Products on the page !
                </td>
                </tr>
            `;
            template += newProducts;
        }
        if (modifiedProducts != "") {
            template += `
                <tr>
                <td>
                Modified Products on the page !
                </td>
                </tr>
            `;
            template += modifiedProducts;
        }
        template += "</table>";
        return template;
    }

    this._init();

    logger.NORMAL(`Setting interval for ${URL.createURL()}, scraping every ${scrapeInterval/1000} seconds`);
    setInterval(function() {
        logger.NORMAL(`New scraping iteration for -> ${URL.createURL()}`);
        self._init();
    }, scrapeInterval);
}

module.exports = new Scrapy();