var cheerio = require('cheerio');
var rq = require('request-promise');
var mailer = require("../mailer");
var logger = require("../logger")('RoyalmileWhisky');
var Product = require('./Product');
var Datastore = require('nedb');
var db = new Datastore({ filename: 'db/royalmileWhisky.db', autoload: true });

var Scrapy = function() {
    var self = this;
    this.outOfStockLabel = "OUT OF STOCK";
    this.inStockLabel = "Price: ";
    initFlag = false;
    this.numProductsOnInit = 100;
    var scrapeInterval = 300000;


    var URL = {
        baseURL: 'https://www.royalmilewhiskies.com',
        newsPath: '/new-products/?limit=36',
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
                console.trace(err);
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
        });
    };

    this.scrape = function() {
        var scrapeURL = URL.createURL();
        return new Promise((resolve, reject) => {
            rq.post(scrapeURL, { form: { num_pag: self.numProductsOnInit } })
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

    };

    var parseAndStoreElementsFromHTML = function(html) {
        const $ = cheerio.load(html);
        var updatedProducts = [];
        var allProducts = [];

        return new Promise((resolve, reject) => {
            var htmlProducts = $('ul.products-grid li.item');

            htmlProducts.each(function() {
                var product = new Product({
                    url: $(this).find('a.product-image').attr('href'),
                    imgURL: $(this).find('a.product-image img').attr('src'),
                    name: $(this).find("div.product-info h2.product-name a").text().trim() + " - " + $(this).find("div.product-info h3.product-sub-title").text().trim(),
                    price: $(this).find('div.product-info div.vatAndPrice span.price').text().trim(),
                    additionlInformation: {
                        vat_label: $(this).find("div.product-info div.vatAndPrice span.vat-label").text().trim(),
                    }
                });

                allProducts.push(product);
            })

            storeProducts(allProducts)
                .then((updatedProducts) => {
                    resolve(updatedProducts);
                })
                .catch((err) => {
                    reject(err);
                });

        })

    };

    var storeProducts = function(products) {
        var updatedProducts = [];
        var maxI = products.length - 1;
        var processedI = 0;
        // Test
        // if (true) {
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

    };

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
    };

    this._init();

    logger.NORMAL(`Setting interval for ${URL.createURL()}, scraping every ${scrapeInterval/1000} seconds`);
    setInterval(function() {
        logger.NORMAL(`New scraping iteration for -> ${URL.createURL()}`);
        self._init();
    }, scrapeInterval);
}

module.exports = new Scrapy();