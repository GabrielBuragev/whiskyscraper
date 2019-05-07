var rq = require('request-promise');
var cheerio = require('cheerio');
var Product = require('./Product');
var mailer = require("../mailer");
var logger = require("../logger");

var Scrapy = function(){
    var self = this;
    var Products = new Map();
    var initFlag = true;
    var scrapeInterval = 300000;
    var URL = {
        baseURL: 'https://oldwhisky.net',
        newsPath: '/en/news',
        createURL: function(){
            return `${this.baseURL}${this.newsPath}`;
        },
    };

    this._init = function(){
        this.scrape()
            .then(() => {
                logger.OK('Successfully scraped and saved the page elements !');
            })
            .catch((err) => {
                logger.ERR(err);
            });

    };

    this.scrape = function(){
        var scrapeURL = URL.createURL();
        return new Promise((resolve, reject) => {
            rq(scrapeURL)
            .then((data) => {
                // console.log(data);
                var reportProducts = parseAndStoreElementsFromHTML(data);
                
                if(initFlag){
                    initFlag = false;
                    return logger.OK(`Successfully stored and prepared ${reportProducts.length} products for watching`);
                }
                if(reportProducts.length > 0){
                    var updateMessage = generateMailTemplate(reportProducts);
                    mailer.sendMail(URL.createURL(), "Product changes on : " + URL.createURL(), updateMessage);
                    
                }else
                    return logger.OK('Nothing to report, going quiet for a while');
            })
            .catch((err) => {
                logger.ERR(`Failed while scraping ${scrapeURL}!`);
                logger.ERR(JSON.stringify(err));
                reject(err);
            })
        })
        
    }
    var parseAndStoreElementsFromHTML = function(html){
        const $ = cheerio.load(html);
        var updatedProducts = [];
        var dateContainers = $('#blushowcase .section-container');
        
        dateContainers.each(function(container, i){
            var container = $(this);
            var htmlProducts = container.find('li');
            var title = container.find('.title-showcase-page > h3 > span').text();
            var dateAdded = title.split(' - ')[1];
            // Test
            // if(!initFlag){
            //     var product = new Product({
            //         dateAdded: '1',
            //         url: '1',
            //         imgURL: '1',
            //         name: '1',
            //         price: '1',
            //         available:'1',
            //         additionalInformation: {
            //             volume: '1',
            //             gradient:'1',
            //         },
            //     });
            //     updatedProducts.push({type:'new', product: product});
            //     var product2 = new Product({
            //         dateAdded: '1',
            //         url: '1',
            //         imgURL: '1',
            //         name: '1',
            //         price: '2',
            //         available:'0',
            //         additionalInformation: {
            //             volume: '1',
            //             gradient:'1',
            //         },
            //     })
            //     product.update(product2);
            //     updatedProducts.push({type:'modified', product:product});
            // }
            htmlProducts.each(function(){
                htmlProduct = $(this);
                var product = new Product({
                    dateAdded: dateAdded,
                    url: htmlProduct.find('.product_img_link').attr('href'),
                    imgURL: htmlProduct.find('.product_img_link > img').attr('src'),
                    name: htmlProduct.find('.list-part-name .prod-name').text(),
                    price: htmlProduct.find('.content_price .price').text(),
                    available:htmlProduct.find('.content_price .unvisible').text().trim(),
                    additionalInformation: {
                        volume: htmlProduct.find('.data-volume').text(),
                        gradient: htmlProduct.find('.data-gradazione').text(),
                    },
                });
                if(Products.has(product.hash)){
                    // TODO: implement change checking
                    var productOld = Products.get(product.hash);
                    var updated = productOld.update(product);
                    if(updated)
                        updatedProducts.push({type: 'modified', product: product});

                    Products.set(product.hash, product);
                }else {
                    Products.set(product.hash, product);
                    updatedProducts.push({type: 'new', product: product});
                }
            })
        });

        return updatedProducts;
    }

    var generateMailTemplate = function(reports){
        var template = `
            <h1> Changes available on ${URL.createURL()} </h1>
            <table border='1' style='border-collapse:collapse;'>
            
        `;
        var newProducts = "";
        var modifiedProducts = "";
        reports.forEach(function(report, i){
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
            if(type == 'new')
                newProducts += productReport;
            if(type == 'modified')
                modifiedProducts += productReport;
        });

        if(newProducts != ""){
            template += `
                <tr>
                <td>
                New Products on the page !
                </td>
                </tr>
            `;
            template += newProducts;
        }
        if(modifiedProducts != ""){
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
    setInterval(function(){
        logger.NORMAL(`New scraping iteration for -> ${URL.createURL()}`);
        self._init();
    }, scrapeInterval);
}

module.exports = new Scrapy();