const nodemailer = require("nodemailer");
const pug = require("pug");
const { convert } = require("html-to-text");

//usage: 
//const email = new Email(user, url) - user contains name,email, url - for example password reset url
//email.sendWelcome() - for new users siginup for new account
//email.sendPasswordReset() - for forgotten password
//..etc

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    //this.from = `Natours.com <${process.env.EMAIL_FROM}>`;
    this.from = `${process.env.EMAIL_FROM}>`;
  }

  createTransport() {
    if (process.env.NODE_ENV === 'production') {
      //SendGrid
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    } 
    
    //development
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    //template - is a pug template for the email body
    //1) Render html for the email based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject: subject
    });

    //2) Define email options (html: rendered pug template)
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html,
      text: convert(html)
    };
  
    //3) Create transport and actually send email
    const transport = this.createTransport();
    await transport.sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the Natours family");
  }

  async sendPasswordReset() {
    await this.send("password-reset", "Your password reset token (valid for only 10 min)");
  }
}

