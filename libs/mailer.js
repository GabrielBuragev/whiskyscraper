var mailer = require('nodemailer');
var logger = require('./logger');
var Mailer = function() {
    var EMAIL = process.env.EMAIL_ETHEREAL;
    var PW = process.env.PW_ETHEREAL;
    var EMAIL_DBG = process.env.EMAIL_DBG;
    var subscribedEmails = [EMAIL, EMAIL_DBG];

    var transporter = undefined;

    initMailer = function() {
        transporter = mailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // use SSL
            auth: {
                user: EMAIL,
                pass: PW
            },
            tls: {
                rejectUnauthorized: false
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
            html: "test"
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