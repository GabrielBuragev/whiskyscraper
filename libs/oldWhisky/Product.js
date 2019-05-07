const crypto = require('crypto');
const secret = 'reallyoldwhisky';
class Product {

    constructor(params){
        this.dateAdded = params.dateAdded;
        this.name = params.name;
        this.price = params.price;
        this.priceBefore = params.price;
        this.available = params.available;
        this.availableBefore = params.available;
        this.url = params.url;
        this.imgURL = params.imgURL;
        this.recentlyChanged = false;
        this.additionalInformation = params.additionalInformation;
        this.hash = crypto.createHmac('sha256', secret).update(`${this.dateAdded}${this.name}`).digest('hex');
    }

    equals(product2){
        return this.hash == product2.hash;
    }

    update(product2){
        if(this.price == product2.price && this.available == product2.available)
            return false;

        // Store price current to price before for printing
        this.priceBefore = this.price;
        this.price = product2.price;
        // Store available current to available before for printing
        this.availableBefore = this.available;
        this.available = product2.available;

        this.additionalInformation.volume = product2.additionalInformation.volume;
        this.additionalInformation.gradient = product2.additionalInformation.gradient;

        return true;
    }
}

module.exports = Product;