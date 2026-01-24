require('dotenv').config();

const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
   // secure: true,
   // logger: true,
    secureConnection: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// Options de l'e-mail
const mailOptions = {
    from: '"Diego" <diegotar005@gmail.com>',
    to: 'diegotar005@gmail.com',
    subject: 'Test Nodemailer',
    text: 'Cet e-mail a été envoyé depuis Node.js !',
    html: '<b>Cet e-mail a été envoyé depuis Node.js !</b>',
};

// Envoi de l'e-mail
cron.schedule('*/1 * * * *', () => {
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Erreur lors de l\'envoi de l\'e-mail :', error);
        } else {
            console.log('E-mail envoyé avec succès :', info.response);
        }
    });
});