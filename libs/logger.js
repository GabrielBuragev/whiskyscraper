var chalk = require('chalk');
var Logger = function(appName) {
    this.OK = function(msg) {
        var date = new Date();
        console.log(chalk.green(`[ ${[date.toDateString(),date.toTimeString()].join(',')} \n [${appName}]-OK-: ${msg}`) + "\n");
    }
    this.WARN = function(msg) {
        var date = new Date();

        console.log(chalk.yellow(`[ ${[date.toDateString(),date.toTimeString()].join(',')} \n [${appName}]-WARN-: ${msg}`) + "\n");
    }
    this.ERR = function(msg) {
        var date = new Date();

        console.log(chalk.red(`[ ${[date.toDateString(),date.toTimeString()].join(',')} \n [${appName}]-ERR-: ${msg}`) + "\n");
    }
    this.NORMAL = function(msg) {
        var date = new Date();

        console.log(chalk.gray(`[ ${[date.toDateString(),date.toTimeString()].join(',')} \n [${appName}]-INFO-: ${msg}`) + "\n");
    }
};

module.exports = function(appName) {
    return new Logger(appName);
}