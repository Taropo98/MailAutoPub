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
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

// Fonction pour récupérer la météo
async function getWeather() {
    try {
        const weatherResponse  = await axios.get(OPENWEATHER_URL, {
            params: {
                q: `${WEATHER_CITY},${WEATHER_COUNTRY_CODE}`,
                appid: OPENWEATHER_API_KEY,
                units: 'metric', // Pour avoir les degrés Celsius
                lang: 'fr', // Pour les descriptions en français
            },
        });

        const forecastResponse = await axios.get(FORECAST_URL, {
            params: {
                q: `${WEATHER_CITY},${WEATHER_COUNTRY_CODE}`,
                appid: OPENWEATHER_API_KEY,
                units: 'metric', // Pour avoir les degrés Celsius
                lang: 'fr', // Pour les descriptions en français
            },
        });

        const weatherData = weatherResponse.data;
        const forecastData = forecastResponse.data;

        // Traiter les données actuelles
        const current = {
            city: weatherData.name,
            country: weatherData.sys.country,
            temperature: Math.round(weatherData.main.temp),
            feelsLike: Math.round(weatherData.main.feels_like),
            humidity: weatherData.main.humidity,
            pressure: weatherData.main.pressure,
            description: weatherData.weather[0].description,
            windSpeed: Math.round(weatherData.wind.speed * 3.6), // Conversion m/s en km/h
            cloudiness: weatherData.clouds.all,
            sunrise: new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString('fr-FR'),
            sunset: new Date(weatherData.sys.sunset * 1000).toLocaleTimeString('fr-FR'),
        };

        // Traiter les prévisions pour le jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayForecasts = forecastData.list.filter(item => {
            const itemDate = new Date(item.dt * 1000);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === today.getTime();
        });

        // Préparer les données pour le graphique
        const chartData = {
            labels: [],
            temperatures: [],
            humidity: [],
            windSpeed: [],
            rainChance: [],
        };

        todayForecasts.forEach(item => {
            const time = new Date(item.dt * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            chartData.labels.push(time);
            chartData.temperatures.push(Math.round(item.main.temp));
            chartData.humidity.push(item.main.humidity);
            chartData.windSpeed.push(Math.round(item.wind.speed * 3.6));
            chartData.rainChance.push((item.pop * 100).toFixed(0));
        });

        // Extraire les prévisions clés : matin (6h), après-midi (12h), soir (18h)
        const forecasts = {
            morning: null,
            afternoon: null,
            evening: null,
            minTemp: todayForecasts.length > 0 ? Math.round(Math.min(...todayForecasts.map(f => f.main.temp_min))) : 'N/A',
            maxTemp: todayForecasts.length > 0 ? Math.round(Math.max(...todayForecasts.map(f => f.main.temp_max))) : 'N/A',
        };
        // Chercher les prévisions les plus proches des heures clés
        todayForecasts.forEach(item => {
            const hour = new Date(item.dt * 1000).getHours();
            
            if (hour >= 6 && hour < 12 && !forecasts.morning) {
                forecasts.morning = {
                    time: new Date(item.dt * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    temp: Math.round(item.main.temp),
                    description: item.weather[0].description,
                    windSpeed: Math.round(item.wind.speed * 3.6),
                    humidity: item.main.humidity,
                    rainChance: (item.pop * 100).toFixed(0),
                };
            }
            
            if (hour >= 12 && hour < 18 && !forecasts.afternoon) {
                forecasts.afternoon = {
                    time: new Date(item.dt * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    temp: Math.round(item.main.temp),
                    description: item.weather[0].description,
                    windSpeed: Math.round(item.wind.speed * 3.6),
                    humidity: item.main.humidity,
                    rainChance: (item.pop * 100).toFixed(0),
                };
            }
            
            if (hour >= 18 && hour < 24 && !forecasts.evening) {
                forecasts.evening = {
                    time: new Date(item.dt * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    temp: Math.round(item.main.temp),
                    description: item.weather[0].description,
                    windSpeed: Math.round(item.wind.speed * 3.6),
                    humidity: item.main.humidity,
                    rainChance: (item.pop * 100).toFixed(0),
                };
            }
        });

    return { current, forecasts, chartData };
    
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de la météo :', error.message);
        throw error;
    }
}

// Fonction pour créer un graphique HTML
function createHTMLChart(chartData) {
    if (chartData.temperatures.length === 0) {
        return '<p style="color: #999; text-align: center;">Pas de données de prévisions disponibles</p>';
    }

    const maxTemp = Math.max(...chartData.temperatures);
    const minTemp = Math.min(...chartData.temperatures);
    const tempRange = maxTemp - minTemp || 1;
    const chartHeight = 200;
    const barWidth = 100 / chartData.labels.length;

    let svg = `
    <svg width="100%" height="${chartHeight + 50}" viewBox="0 0 800 ${chartHeight + 50}" style="margin: 20px 0;">
        <!-- Grille de fond -->
        <defs>
            <pattern id="grid" width="80" height="40" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 40" fill="none" stroke="#eee" stroke-width="0.5"/>
            </pattern>
        </defs>
        <rect width="800" height="${chartHeight}" fill="url(#grid)" />
        
        <!-- Axe Y (température) -->
        <line x1="40" y1="0" x2="40" y2="${chartHeight}" stroke="#333" stroke-width="2"/>
        <line x1="40" y1="${chartHeight}" x2="800" y2="${chartHeight}" stroke="#333" stroke-width="2"/>
        
        <!-- Labels Y -->
        <text x="35" y="15" font-size="12" text-anchor="end" fill="#666">${maxTemp}°C</text>
        <text x="35" y="${chartHeight - 5}" font-size="12" text-anchor="end" fill="#666">${minTemp}°C</text>
        
        <!-- Barres de température -->
    `;

    chartData.temperatures.forEach((temp, index) => {
        const normalizedTemp = (temp - minTemp) / tempRange;
        const barHeight = normalizedTemp * chartHeight;
        const x = 50 + (index * (750 / chartData.temperatures.length));
        const y = chartHeight - barHeight;
        const color = temp > 15 ? '#ff6b6b' : temp > 10 ? '#ffa500' : '#667eea';

        svg += `
            <rect x="${x}" y="${y}" width="${Math.max(750 / chartData.temperatures.length - 2, 5)}" height="${barHeight}" fill="${color}" opacity="0.7" />
            <text x="${x + (750 / chartData.temperatures.length / 2)}" y="${chartHeight + 20}" font-size="10" text-anchor="middle" fill="#666">${chartData.labels[index]}</text>
            <text x="${x + (750 / chartData.temperatures.length / 2)}" y="${y - 5}" font-size="11" font-weight="bold" text-anchor="middle" fill="#333">${temp}°</text>
        `;
    });

    svg += `</svg>`;
    return svg;
}

// Fonction pour créer le contenu HTML de l'e-mail
function createWeatherEmail(data) {
    const { current, forecasts, chartData } = data;
    const chartHTML = createHTMLChart(chartData);
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
            .section-title {
                font-size: 18px;
                font-weight: bold;
                color: #333;
                margin: 25px 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid #667eea;
            }
            .current-weather {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .current-weather .temp {
                font-size: 48px;
                font-weight: bold;
                margin: 10px 0;
            }
            .current-weather .description {
                font-size: 18px;
                text-transform: capitalize;
                margin: 10px 0;
            }
            .chart-container {
                margin: 20px 0;
                background-color: #f9f9f9;
                padding: 15px;
                border-radius: 10px;
                overflow-x: auto;
            }
            .forecast-container {
                display: flex;
                gap: 15px;
                margin: 20px 0;
            }
            .forecast-item {
                flex: 1;
                background-color: #f9f9f9;
                padding: 15px;
                border-radius: 10px;
                text-align: center;
                border: 1px solid #eee;
            }
            .forecast-item .time {
                font-weight: bold;
                color: #667eea;
                font-size: 14px;
                margin-bottom: 10px;
            }
            .forecast-item .temp {
                font-size: 24px;
                font-weight: bold;
                color: #333;
                margin: 10px 0;
            }
            .forecast-item .description {
                font-size: 12px;
                color: #666;
                text-transform: capitalize;
                margin: 8px 0;
            }
            .forecast-item .detail {
                font-size: 11px;
                color: #999;
                margin: 5px 0;
            }
            .temp-range {
                background-color: #f0f0f0;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: center;
            }
            .temp-range .label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-bottom: 10px;
            }
            .temp-range .temps {
                font-size: 28px;
                font-weight: bold;
                color: #333;
            }
            .details-table {
                width: 100%;
                margin: 20px 0;
            }
            .details-table tr {
                border-bottom: 1px solid #eee;
            }
            .details-table td {
                padding: 12px 0;
            }
            .details-table .label {
                color: #666;
                font-weight: 600;
                font-size: 14px;
            }
            .details-table .value {
                color: #333;
                font-weight: 500;
                font-size: 14px;
                text-align: right;
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
                <p>${current.city}, ${current.country}</p>
            </div>

            <!-- Météo actuelle -->
            <div class="current-weather">
                <div style="font-size: 14px; opacity: 0.9;">Conditions actuelles</div>
                <div class="temp">${current.temperature}°C</div>
                <div class="description">${current.description}</div>
                <div style="font-size: 13px; margin-top: 10px;">Ressenti : ${current.feelsLike}°C</div>
            </div>

            <!-- Graphique -->
            <div class="section-title">📈 Évolution de la journée</div>
            <div class="chart-container">
                ${chartHTML}
            </div>

            <!-- Prévisions de la journée -->
            <div class="section-title">📅 Prévisions de la journée</div>
            <div class="forecast-container">
                ${forecasts.morning ? `
                <div class="forecast-item">
                    <div class="time">🌅 Matin</div>
                    <div class="time">${forecasts.morning.time}</div>
                    <div class="temp">${forecasts.morning.temp}°C</div>
                    <div class="description">${forecasts.morning.description}</div>
                    <div class="detail">💧 ${forecasts.morning.humidity}%</div>
                    <div class="detail">💨 ${forecasts.morning.windSpeed} km/h</div>
                    <div class="detail">🌧️ ${forecasts.morning.rainChance}% pluie</div>
                </div>
                ` : '<div class="forecast-item"><p style="color: #999;">Pas de données</p></div>'}
                ${forecasts.afternoon ? `
                <div class="forecast-item">
                    <div class="time">☀️ Après-midi</div>
                    <div class="time">${forecasts.afternoon.time}</div>
                    <div class="temp">${forecasts.afternoon.temp}°C</div>
                    <div class="description">${forecasts.afternoon.description}</div>
                    <div class="detail">💧 ${forecasts.afternoon.humidity}%</div>
                    <div class="detail">💨 ${forecasts.afternoon.windSpeed} km/h</div>
                    <div class="detail">🌧️ ${forecasts.afternoon.rainChance}% pluie</div>
                </div>
                ` : '<div class="forecast-item"><p style="color: #999;">Pas de données</p></div>'}
                ${forecasts.evening ? `
                <div class="forecast-item">
                    <div class="time">🌆 Soir</div>
                    <div class="time">${forecasts.evening.time}</div>
                    <div class="temp">${forecasts.evening.temp}°C</div>
                    <div class="description">${forecasts.evening.description}</div>
                    <div class="detail">💧 ${forecasts.evening.humidity}%</div>
                    <div class="detail">💨 ${forecasts.evening.windSpeed} km/h</div>
                    <div class="detail">🌧️ ${forecasts.evening.rainChance}% pluie</div>
                </div>
                ` : '<div class="forecast-item"><p style="color: #999;">Pas de données</p></div>'}
            </div>

            <!-- Températures min/max -->
            <div class="temp-range">
                <div class="label">Températures du jour</div>
                <div class="temps">Min: ${forecasts.minTemp}°C | Max: ${forecasts.maxTemp}°C</div>
            </div>

            <!-- Détails supplémentaires -->
            <div class="section-title">📊 Détails</div>
            <table class="details-table" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="label">💧 Humidité</td>
                    <td class="value">${current.humidity}%</td>
                </tr>
                <tr>
                    <td class="label">💨 Vitesse du vent</td>
                    <td class="value">${current.windSpeed} km/h</td>
                </tr>
                <tr>
                    <td class="label">🌫️ Pression</td>
                    <td class="value">${current.pressure} hPa</td>
                </tr>
                <tr>
                    <td class="label">☁️ Couverture nuageuse</td>
                    <td class="value">${current.cloudiness}%</td>
                </tr>
                <tr>
                    <td class="label">🌅 Lever du soleil</td>
                    <td class="value">${current.sunrise}</td>
                </tr>
                <tr>
                    <td class="label">🌇 Coucher du soleil</td>
                    <td class="value">${current.sunset}</td>
                </tr>
            </table>

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
// '0 8 * * *' = 8h00 tous les jours
cron.schedule('0 8 * * * ', async () => {
    console.log(`[${new Date().toISOString()}] Tentative d'envoi d'e-mail...`);
    
    try {

        // Récupérer la météo
        const weather = await getWeather();
        console.log(`[${new Date().toISOString()}] ✅ Météo récupérée : ${weather.current.temperature}°C à ${weather.current.city}`);

        // Créer le contenu HTML
        const htmlContent = createWeatherEmail(weather);

        // Options de l'e-mail
        const mailOptions = {
            to: 'MAIL',
            from: 'MAIL', // Doit être une adresse vérifiée sur SendGrid
            subject: `Météo du jour – ${weather.current.city} : ${weather.current.temperature}°C`,
            text: `Météo à ${weather.current.city}: ${weather.current.temperature}°C, ${weather.current.description}`,
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