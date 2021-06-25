const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
// const nodemailerSendgrid = require('nodemailer-sendgrid');

// new Email(user, url).sendWelcome();

module.exports = class Email {
  constructor(user, url) {
    this.user = user;
    this.to = user.email;
    this.url = url;
    this.firstName = user.name.split(' ')[0];
    this.from = `Mohamed El-Esnawy ${process.env.EMAIL_FROM}`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'development') {
      // return nodemailer.createTransport(
      //   nodemailerSendgrid({
      //     apiKey: process.env.GRID_PASS
      //   })
      // );

      // return nodemailer.createTransport({
      //   service: 'SendGrid',
      //   auth: {
      //     user: process.env.SENDGRID_USERNAME,
      //     pass: process.env.SENDGRID_PASSWORD
      //   }
      // });

      return nodemailer.createTransport({
        service: 'SendGrid',
        from: process.env.EMAIL_FROM,
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.GRID_PASS
        }
      });
    }
    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // const transport = nodemailer.createTransport({
    //   host: 'smtp.mailtrap.io',
    //   port: 2525,
    //   auth: {
    //     user: 'a751bd7c04c233',
    //     pass: '39b47c94fc2379'
    //   }
    // });
    return transport;
  }

  // send the actual email
  async send(template, subject) {
    //1- render HTML based on pug tempalte
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject
    });

    //2- define mails options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html)
      //html:
    };
    //3- create a transport and send email
    const transporter = this.newTransport();
    await transporter.sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome the the natours Family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

// const sendEmail = async options => {
//   //1- create a transporter
//   const transporter = nodemailer.createTransport({
//     // service: 'Gmail',
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD
//     }
//   });
//   //2- define the email options
//   const mailOptions = {
//     from: `Mohamed EL-Esnawy <hello@gmail.com>`,
//     to: options.email,
//     subject: options.subject,
//     text: options.message
//   };
//   //3- send the email with nodemailer

//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
