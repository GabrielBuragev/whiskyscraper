var mailer = require('nodemailer');
var logger = require('./logger')('_MAILER_');
var Mailer = function() {
    var EMAIL = process.env.EMAIL_PROD;
    var PW = process.env.PW_PROD;
    var EMAIL_DBG = process.env.EMAIL_DBG;
    var subscribedEmails = (process.env.DEV == 1) ? ([EMAIL_DBG]) : [EMAIL_DBG, EMAIL];
    var EMAIL_PROVIDER = process.env.EMAIL_PROVIDER;
    var transporter = undefined;

    initMailer = function() {
        transporter = mailer.createTransport({
            service: EMAIL_PROVIDER,
            auth: {
                user: EMAIL,
                pass: PW
            }
        });
    }

    this.sendMail = function(from, subject, text) {
        var mailOptions = {
            from: '"' + from + '" <' + EMAIL + '>', // sender address (who sends)
            subject: subject, // Subject line
            html: text
        };
        for (var i = 0; i < subscribedEmails.length; i++) {
            mailOptions.to = subscribedEmails[i];

            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    return logger.ERR(error);
                }

                logger.OK('Message sent successfully: ' + info.response);

            });
        }

    }

    this.testMailFunction = function() {
        var mailOptions = {
            from: '"me - test" <' + EMAIL + '>', // sender address (who sends)
            subject: "test", // Subject line
            html: "<h1 style='color:red'>test</h1>"
        };
        for (var i = 0; i < subscribedEmails.length; i++) {
            mailOptions.to = subscribedEmails[i];

            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    return logger.ERR(error);
                }

                logger.OK('Message sent successfully: ' + info.response);

            });
        }
    }
    var self = this;
    initMailer();
}

module.exports = new Mailer();
