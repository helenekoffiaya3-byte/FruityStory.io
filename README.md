# FruityStory.io

Projet web FruityStory.io : création de dramas de fruits, génération IA, Studio créateur, édition et préparation à la publication.

## Interface

- `index.html` — vitrine et accueil
- `auth.html` — connexion
- `dashboard.html` — profil / tableau de bord
- `studio.html` — FruityStory Studio
- `generate.html` — générateur IA
- `editor.html` / `editor.js` / `editor.css` — éditeur
- `publish.html` — publication et zone de diffusion
- `rewards.html` — programme de récompenses créateurs
- `credits.html` — crédits
- `settings.html` / `settings.css` — paramètres
- `styles.css` / `app.js` — base UI et interactions

## Backend Netlify

- `netlify/functions/health.js` — contrôle de santé
- `netlify/functions/ai-story.ts` — préparation des personnages et scènes par IA
- `netlify/functions/video-engine.ts` — point d'entrée d'orchestration des fournisseurs vidéo
- `netlify.toml` — configuration Netlify
- `package.json` — dépendances des Functions

## Règles FruityStory

Les dramas sont conçus comme des scènes jouées dans la vie réelle : dialogues et actions, sans narration imposée. Les personnages sont des fruits anthropomorphes ; le fruit est une référence visuelle et le nom reste libre et créatif.

La localisation de publication indique où le créateur souhaite diffuser son contenu : monde entier, continent, pays ou région/zone. Elle ne demande pas sa position GPS personnelle.

## Netlify

Le dépôt est structuré pour être importé dans Netlify : publication à la racine et Functions dans `netlify/functions` avec bundler esbuild.

Avant toute génération IA réelle, configurer l'authentification du fournisseur dans les variables d'environnement Netlify ou activer Netlify AI Gateway lorsque cette voie est utilisée. **Aucune clé API ne doit être commitée dans GitHub.**

Les intégrations d'authentification, paiement, fournisseurs vidéo et services externes restent des configurations/connexions de production à effectuer après l'import du dépôt.
