const crypto = require('crypto');
const secret = 'lionwhisky';
class Product {

    constructor(params) {
        this.timestamp = params.timestamp || Date.now();
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
        this.hash = this.getUniqueHash();
        this._id = this.hash;
    }
    toJSON() {
        return {
            timestamp: this.timestamp,
            dateAdded: this.dateAdded,
            name: this.name,
            price: this.price,
            available: this.available,
            url: this.url,
            imgURL: this.imgURL,
            additionalInformation: this.additionalInformation,
            _id: this._id,
        }
    }
    getUniqueHash() {
        return crypto.createHmac('sha256', secret).update(`${this.name}`).digest('hex');
    }

    equals(product2) {
        return this.hash == product2.hash;
    }

    update(product2) {
        if (this.price == product2.price && this.available == product2.available)
            return false;

        // Store price current to price before for printing
        this.priceBefore = this.price;
        this.price = product2.price;
        // Store available current to available before for printing
        this.availableBefore = this.available;
        this.available = product2.available;

        return true;
    }
}

module.exports = Product;