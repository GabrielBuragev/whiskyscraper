var mailer = require('nodemailer');
var logger = require('./logger');
var Mailer = function() {
    var EMAIL = process.env.EMAIL;
    var PW = process.env.PW;
    var EMAIL_DBG = process.env.EMAIL_DBG;
    var subscribedEmails = [EMAIL, EMAIL_DBG];

    var transporter = undefined;

    initMailer = function() {
        transporter = mailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
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

    var self = this;
    initMailer();
}

module.exports = new Mailer();