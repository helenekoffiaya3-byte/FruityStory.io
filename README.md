# FruityStory.io

Plateforme de création vidéo IA, Studio créateur et **Developer Platform** pour intégrer la génération vidéo, les crédits et les paiements dans des applications tierces.

## Interface

- `index.html` — vitrine et accueil
- `auth.html` — connexion
- `dashboard.html` — profil / tableau de bord
- `studio.html` — FruityStory Studio
- `generate.html` — générateur IA
- `developer.html` — portail développeurs
- `developer-docs.html` — documentation API
- `editor.html` / `editor.js` / `editor.css` — éditeur
- `publish.html` — publication et zone de diffusion
- `rewards.html` — programme de récompenses créateurs
- `credits.html` — crédits

## Developer Platform

La plateforme expose une architecture API pour :

- génération vidéo IA (`/api/video/generate`)
- suivi des jobs (`/api/video/status`)
- gestion de l'usage et des crédits (`/api/usage`)
- création de checkout paiement (`/api/payments/checkout`)
- réception et validation des webhooks paiement (`/api/payments/webhook`)
- futures clés API et projets développeur

Les intégrations paiement doivent être exécutées côté serveur et confirmées par webhook. Aucun secret fournisseur ou clé privée ne doit être placé dans le frontend ou commitée dans GitHub.

## Backend Netlify

- `netlify/functions/health.js` — contrôle de santé
- `netlify/functions/ai-story.ts` — préparation des personnages et scènes par IA
- `netlify/functions/video-engine.ts` — orchestration des fournisseurs vidéo

Avant toute génération IA ou paiement réel, configurer les fournisseurs dans les variables d'environnement Netlify. Les identifiants publics (ex. price ID) peuvent être utilisés côté client, mais les clés secrètes restent côté serveur.
