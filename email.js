require('dotenv').config();

const cron = require('node-cron');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');

// Vérifier que la clé API est présente
if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ ERREUR : SENDGRID_API_KEY n\'est pas définie dans les variables d\'environnement');
    process.exit(1);
}

if (!process.env.OPENWEATHER_API_KEY) {
    console.error('❌ ERREUR : OPENWEATHER_API_KEY n\'est pas définie');
    process.exit(1);
}

// Configurer SendGrid avec votre clé API
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Paramètres météo
const WEATHER_CITY = process.env.WEATHER_CITY || 'Lyon'; // Ville par défaut
const WEATHER_COUNTRY_CODE = process.env.WEATHER_COUNTRY_CODE || 'FR'; // Code pays
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Fonction pour récupérer la météo
async function getWeather() {
    try {
        const response = await axios.get(OPENWEATHER_URL, {
            params: {
                q: `${WEATHER_CITY},${WEATHER_COUNTRY_CODE}`,
                appid: OPENWEATHER_API_KEY,
                units: 'metric', // Pour avoir les degrés Celsius
                lang: 'fr', // Pour les descriptions en français
            },
        });

        const data = response.data;
        return {
            city: data.name,
            country: data.sys.country,
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            description: data.weather[0].description,
            windSpeed: Math.round(data.wind.speed * 3.6), // Conversion m/s en km/h
            cloudiness: data.clouds.all,
            sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('fr-FR'),
            sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('fr-FR'),
        };
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de la météo :', error.message);
        throw error;
    }
}

// Fonction pour créer le contenu HTML de l'e-mail
function createWeatherEmail(weather) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
                <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background-color: #f5f5f5; 
                line-height: 1.6;
            }
            .container { 
                max-width: 600px; 
                margin: 20px auto; 
                background-color: white; 
                padding: 30px; 
                border-radius: 12px; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
            }
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 30px; 
                border-radius: 12px; 
                text-align: center; 
                margin-bottom: 30px;
            }
            .header h1 { 
                margin: 0; 
                font-size: 32px; 
                margin-bottom: 10px;
            }
            .header p { 
                margin: 0; 
                font-size: 16px; 
                opacity: 0.9;
            }
            .weather-main { 
                display: flex; 
                justify-content: space-between; 
                margin: 30px 0; 
                gap: 20px;
            }
            .weather-item { 
                flex: 1; 
                text-align: center;
            }
            .weather-item .label { 
                color: #666; 
                font-size: 11px; 
                text-transform: uppercase; 
                letter-spacing: 1px;
                margin-bottom: 8px;
                display: block;
            }
            .weather-item .value { 
                font-size: 28px; 
                font-weight: bold; 
                color: #333; 
                margin-bottom: 15px;
                display: block;
            }
            .weather-details { 
                background-color: #f9f9f9; 
                padding: 25px; 
                border-radius: 10px; 
                margin: 30px 0;
            }
            .detail-row { 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                padding: 15px 0; 
                border-bottom: 1px solid #eee;
            }
            .detail-row:last-child { 
                border-bottom: none; 
            }
            .detail-label { 
                color: #666; 
                font-weight: 600;
                font-size: 14px;
            }
            .detail-value { 
                color: #333; 
                font-weight: 500;
                font-size: 14px;
            }
            .footer { 
                text-align: center; 
                color: #999; 
                font-size: 12px; 
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            .footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌤️ Météo du jour</h1>
                <p>${weather.city}, ${weather.country}</p>
            </div>

            <div class="weather-main">
                <div class="weather-item">
                    <span class="label">Température</span>
                    <span class="value">${weather.temperature}°C</span>
                    <span class="label">Ressenti</span>
                    <span class="value">${weather.feelsLike}°C</span>
                    <span class="label">Conditions</span>
                    <span class="value" style="text-transform: capitalize; font-size: 18px;">${weather.description}</span>
                </div>
            </div>

            <div class="weather-details">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-label">💧 Humidité</span>
                        </td>
                        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-value">${weather.humidity}%</span>
                        </td>
                    </tr>
            
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-label">💨 Vitesse du vent</span>
                        </td>
                        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-value">${weather.windSpeed} km/h</span>
                        </td>
                    </tr>
            
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-label">🌫️ Pression</span>
                        </td>
                        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-value">${weather.pressure} hPa</span>
                        </td>
                    </tr>
            
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-label">☁️ Couverture nuageuse</span>
                        </td>
                        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-value">${weather.cloudiness}%</span>
                        </td>
                    </tr>
            
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-label">🌅 Lever du soleil</span>
                        </td>
                        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                            <span class="detail-value">${weather.sunrise}</span>
                        </td>
                    </tr>
            
                    <tr>
                        <td style="padding: 12px 0;">
                            <span class="detail-label">🌇 Coucher du soleil</span>
                        </td>
                        <td align="right" style="padding: 12px 0;">
                            <span class="detail-value">${weather.sunset}</span>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="footer">
                <p>Données fournies par OpenWeatherMap</p>
                <p>Envoyé le ${new Date().toLocaleString('fr-FR')}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return html;
}



// Planifier l'envoi d'e-mail toutes les minutes
// Format cron : seconde minute heure jour mois jour_de_semaine
// '*/1 * * * *' = toutes les minutes
cron.schedule('*/1 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Tentative d'envoi d'e-mail...`);
    
    try {

        // Récupérer la météo
        const weather = await getWeather();
        console.log(`[${new Date().toISOString()}] ✅ Météo récupérée : ${weather.temperature}°C à ${weather.city}`);

        // Créer le contenu HTML
        const htmlContent = createWeatherEmail(weather);

        // Options de l'e-mail
        const mailOptions = {
            to: 'diegotar005@gmail.com',
            from: 'diegotar005@gmail.com', // Doit être une adresse vérifiée sur SendGrid
           subject: `Météo du jour – ${weather.city} : ${weather.temperature}°C`,
            text: 'Météo à ${weather.city}: ${weather.temperature}°C, ${weather.description}',
            html: htmlContent,
        };

        // Envoyer l'e-mail
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

console.log('🚀 Service météo démarré.');
console.log(`📍 Ville : ${WEATHER_CITY}, ${WEATHER_COUNTRY_CODE}`);
console.log('⏰ Envoi prévu : Tous les jours à 8h00');
console.log('En attente du prochain envoi...');