var mailer = require("nodemailer");
var logger = require("./logger")("_MAILER_");
var Mailer = function() {
  var EMAIL_PROD = process.env.EMAIL_PROD;
  var EMAIL_DBG = process.env.EMAIL_DBG;
  var PW_DBG = process.env.PW_DBG;
  var subscribedEmails =
    process.env.DEV == 1 ? [EMAIL_DBG] : [EMAIL_DBG, EMAIL_PROD];
  var EMAIL_PROVIDER = process.env.EMAIL_PROVIDER;
  var transporter = undefined;

  initMailer = function() {
    transporter = mailer.createTransport({
      service: EMAIL_PROVIDER,
      auth: {
        user: EMAIL_DBG,
        pass: PW_DBG
      }
    });
  };

  this.sendMail = function(from, subject, text) {
    var mailOptions = {
      from: '"' + from + '" <' + EMAIL_PROD + ">", // sender address (who sends)
      subject: subject, // Subject line
      html: text
    };
    for (var i = 0; i < subscribedEmails.length; i++) {
      mailOptions.to = subscribedEmails[i];

      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          return logger.ERR(error);
        }

        logger.OK("Message sent successfully: " + info.response);
      });
    }
  };

  this.testMailFunction = function() {
    var mailOptions = {
      from: '"me - test" <' + EMAIL_PROD + ">", // sender address (who sends)
      subject: "test", // Subject line
      html: "<h1 style='color:red'>test</h1>"
    };
    for (var i = 0; i < subscribedEmails.length; i++) {
      mailOptions.to = subscribedEmails[i];

      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          return logger.ERR(error);
        }

        logger.OK("Message sent successfully: " + info.response);
      });
    }
  };
  var self = this;
  initMailer();
};

module.exports = new Mailer();
