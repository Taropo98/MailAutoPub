require('dotenv').config();

const cron = require('node-cron');
const sgMail = require('@sendgrid/mail');

// Vérifier que la clé API est présente
if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ ERREUR : SENDGRID_API_KEY n\'est pas définie dans les variables d\'environnement');
    process.exit(1);
}

// Configurer SendGrid avec votre clé API
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Options de l'e-mail
const mailOptions = {
    to: 'diegotar005@gmail.com',
    from: 'diegotar005@gmail.com', // Doit être une adresse vérifiée sur SendGrid
    subject: 'Test SendGrid - Envoi automatisé',
    text: 'Cet e-mail a été envoyé depuis Node.js via SendGrid !',
    html: '<b>Cet e-mail a été envoyé depuis Node.js via SendGrid !</b>',
};

// Planifier l'envoi d'e-mail toutes les minutes
// Format cron : seconde minute heure jour mois jour_de_semaine
// '*/1 * * * *' = toutes les minutes
cron.schedule('*/1 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Tentative d'envoi d'e-mail...`);
    
    try {
        const response = await sgMail.send(mailOptions);
        console.log(`[${new Date().toISOString()}] ✅ E-mail envoyé avec succès !`);
        console.log(`   ID du message : ${response[0].headers['x-message-id']}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Erreur lors de l'envoi de l'e-mail :`, error.message);
        if (error.response) {
            console.error('   Détails :', error.response.body);
        }
    }
});

console.log('🚀 Service d\'envoi d\'e-mails démarré. En attente de la prochaine minute...');