require('dotenv').config();

const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Vérifier que la clé API est présente
if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ ERREUR : SENDGRID_API_KEY n\'est pas définie dans les variables d\'environnement');
    process.exit(1);
}

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
   // secure: true,
   // logger: true,
    secure: false,
    auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
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