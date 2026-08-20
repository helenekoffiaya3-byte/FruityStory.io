# Netlify deploy

## Projet
- Site Netlify : `fruitystory-io`
- Dépôt GitHub : `helenekoffiaya3-byte/FruityStory.io`
- Branche de déploiement : `main`
- Team Netlify : `FruityStory.io`
- Team ID : `6a80a06987024b2ce9019164`
- Site ID : `7330e3e5-6436-48d5-aa4a-0ea3d3490715`
- Base directory : `/`
- Build command : `npm run build`
- Publish directory : `.`
- Netlify Functions : `netlify/functions`
- Domaine API précédemment utilisé : `api.fruitystory.io`

## Déploiement
1. Synchroniser le dépôt GitHub sur `main`.
2. Installer les dépendances avec `npm install`.
3. Exécuter le build avec `npm run build`.
4. Vérifier que le build se termine sans erreur.
5. Vérifier les fonctions Netlify dans `netlify/functions`.
6. Vérifier les variables d'environnement Netlify en contexte `Production`.
7. Déclencher le déploiement depuis le dépôt GitHub/Netlify.
8. Vérifier le statut du déploiement et le journal de build.
9. Vérifier le site publié et les endpoints API après le déploiement.

## Sécurité des variables d'environnement
Les clés et secrets ne doivent jamais être écrits dans ce fichier, dans le frontend, ni commités dans GitHub. Ils doivent être configurés uniquement dans Netlify Environment Variables, avec le bon contexte (`Production`, et autres contextes si nécessaires).

Variables précédemment utilisées dans le projet :
- `OPENAI_API_KEY`
- `NETLIFY_API_TOKEN`
- `GITHUB_KEY`
- `JWT_SECRET`
- `NETLIFY_FFMPEG_PATH`

Ne pas mettre les valeurs de ces variables dans le dépôt.

## Build et CI
- Le build attendu est `npm run build`.
- Le dernier commit précédemment identifié était `2975e1c5…`.
- Une exécution GitHub Actions récente n'avait pas été confirmée dans le diagnostic précédent.
- La validation finale doit être basée sur un build réellement exécuté et sur son journal, pas uniquement sur la configuration.
- En cas d'échec CI, identifier l'étape exacte, corriger la cause, puis relancer la CI concernée.

## Vérifications avant production
- Frontend : pages, navigation, assets et appels API.
- Backend : Netlify Functions et variables d'environnement.
- Build : `npm run build` sans erreur.
- Secrets : aucune clé API ou secret exposé dans les fichiers publics.
- APIs : vérifier les fournisseurs réellement configurés et leurs endpoints de santé sans exposer les clés.
- Paiements : vérifier la configuration Stripe côté serveur et les Price IDs configurés dans l'environnement.
- Vidéo : vérifier les fonctions de génération et le chemin FFmpeg si utilisé.
- Authentification : vérifier les sessions/JWT et les secrets côté serveur.
- Production : vérifier le déploiement final, l'URL publique et les logs Netlify.

## Stripe — Price IDs de référence
- Standard mensuel : `price_1U62WvCddMFAR9EQcMw4vpGU`
- Standard annuel : `price_1U62X0CddMFAR9EQxMraf4R6`
- Premium mensuel : `price_1U62X5CddMFAR9EQUSG7neMT`
- Premium annuel : `price_1U62XBCddMFAR9EQWic9vgPm`
- Pro mensuel : `price_1U62XHCddMFAR9EQkCpJpLRu`
- Pro annuel : `price_1U62XMCddMFAR9EQhWM6vtMY`
- Ultra Pro mensuel : `price_1U62XSCddMFAR9EQE1bEmZUl`
- Ultra Pro annuel : `price_1U62XgCddMFAR9EQaCyil9yW`

Les clés Stripe secrètes, webhook secrets et autres secrets Stripe restent exclusivement dans Netlify Environment Variables.

## Fonctions et fichiers importants
Fichiers/fonctions mentionnés dans le projet :
- `index.html`
- `package.json`
- `netlify.toml`
- `generate-video.ts`
- `video-jobs.ts`
- `video-job-status.ts`
- `providers.ts`
- `store.ts`
- `types.ts`

## Objectif de validation finale
Le déploiement production est considéré comme validé seulement lorsque :
- le build réel passe sans erreur ;
- les CI pertinentes passent ;
- les variables de production sont présentes et correctement nommées ;
- aucune clé secrète n'est exposée dans le dépôt ou le frontend ;
- les fonctions Netlify répondent correctement ;
- Stripe et les services nécessaires répondent correctement ;
- le déploiement Netlify est publié avec succès ;
- les logs Netlify ne montrent pas d'erreur bloquante ;
- un contrôle fonctionnel du site en production est effectué.

## Note
Ce fichier est un dossier de référence de déploiement. Il ne remplace pas `netlify.toml`, `package.json`, les workflows GitHub Actions ou les variables d'environnement Netlify. Les valeurs sensibles ne doivent pas être ajoutées ici.
