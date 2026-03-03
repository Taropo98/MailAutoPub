<u>**MailAuto – Service d’envoi automatique de météo par e-mail**</u>

Application Node.js qui envoie automatiquement chaque matin un e-mail contenant :

- Un graphique de l’évolution horaire de la température

- Les prévisions détaillées (matin / après-midi / soir)

- Humidité, vent, pression

- Lever et coucher du soleil

 Ce projet est aussi ma première application utilisant le format JSON, que je ne connaissais pas auparavant. Il m’a permis de comprendre comment récupérer et exploiter les données d’une API météo dans une application backend.

 <u>**Fonctionnalités**</u>

- Envoi automatique quotidien (8h par défaut)

- Graphique SVG intégré dans l’e-mail

- Données météo complètes

- E-mail responsive et professionnel

- Utilisation des variables d’environnement (.env)

- Compatible avec Render, Railway, Fly.io…

 <u>**Installation et configuration**</u>
 
**Étape 1 — Télécharger le projet depuis GitHub**

Allez sur la page GitHub du projet.

Cliquez sur "Code"

Copiez le lien HTTPS

Ouvrez un terminal sur votre ordinateur

Placez-vous dans le dossier où vous voulez mettre le projet (exemple : Bureau)

Puis tapez : *git clone URL_DU_REPO*

Ensuite : *cd nom-du-projet*

--> Vous êtes maintenant à l’intérieur du dossier du projet.

**Étape 2 — Installer les dépendances**

Toujours dans le dossier du projet (dans le terminal), tapez : *npm install*

--> Cette commande installe automatiquement toutes les librairies nécessaires au fonctionnement de l’application.

**Étape 3 — Configurer les clés API**

À la racine du projet, ouvrez le fichier .env

Remplissez vos clés API météo que vous trouverez dans le site d'OpenWeather. Voici le lien : **https://openweathermap.org/**

**Étape 4 — Personnalisation**

Vous pouvez modifier certains paramètres dans le fichier email.js :

- Ville → Ligne 22 (Lyon par défaut)

- Heure d’envoi → Ligne 473 (8h par défaut)

- Email destinataire / expéditeur → Lignes 487 et 488

- Lancer l’application avec node index.js dans le terminal (toujours dans le dossier du projet)

L’application démarre et enverra automatiquement la météo à l’heure configurée.
