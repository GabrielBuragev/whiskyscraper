var chalk = require('chalk');
var Logger = function() {
    this.OK = function(msg) {
        var date = new Date();
        console.log(chalk.green("[" + date.toDateString() + ", " + date.toTimeString() + "] \n" + "-OK-:" + msg) + "\n");
    }
    this.WARN = function(msg) {
        var date = new Date();

        console.log(chalk.yellow("[" + date.toDateString() + ", " + date.toTimeString() + "] \n" + "-WARN-:" + msg) + "\n");
    }
    this.ERR = function(msg) {
        var date = new Date();

        console.log(chalk.red("[" + date.toDateString() + ", " + date.toTimeString() + "] \n" + "-ERR-: " + msg) + "\n");
    }
    this.NORMAL = function(msg) {
        var date = new Date();

        console.log(chalk.gray("[" + date.toDateString() + ", " + date.toTimeString() + "] \n" + "-INFO-:" + msg) + "\n");
    }
};

module.exports = new Logger();