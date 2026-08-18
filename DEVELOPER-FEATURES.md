# FruityStory.io — fonctionnalités conservées

Ce document centralise les fonctionnalités demandées pour la plateforme développeur FruityStory.io.

## 1. Plateforme développeur IA vidéo
- API publique versionnée (`/api/v1`).
- Génération vidéo IA depuis des prompts.
- Architecture multi-provider pour Sora, Veo/Gemini, PixVerse, Seedance et autres adaptateurs compatibles.
- Création de clips courts puis assemblage côté backend pour les productions longues.
- Suivi des jobs vidéo : création, statut, résultat et erreurs.

## 2. FSK — FruityStory Key
- Les utilisateurs développeurs peuvent créer et gérer leurs propres clés API depuis leur espace développeur.
- Les clés live utilisent le préfixe `fsk_live_`.
- Les secrets de signature et secrets fournisseurs restent exclusivement côté serveur/Netlify.
- Les clés ne doivent jamais être générées ou stockées dans le code frontend.
- Scopes prévus : `video:generate`, `video:read`, `video:publish`, `developer:keys`.

## 3. Abonnement Developer API Keys
- Offre développeur dédiée : **6 €**.
- Accès aux outils développeur et à la gestion des clés API Developer.
- Gestion future des quotas/crédits et limites via le backend.

## 4. FC Live / fournisseur
- Le backend doit pouvoir fonctionner comme fournisseur de services API FruityStory.
- Les identifiants et secrets fournisseur sont injectés par variables d'environnement.
- Aucune clé réelle n'est inscrite dans GitHub.

## 5. Paiements et abonnements
- Stripe reste le système de paiement prévu pour les abonnements et crédits.
- Les prix, Price IDs et secrets Stripe sont configurés côté serveur/Netlify.
- Aucun secret de paiement ne doit être commité dans le dépôt.

## 6. Expérience créateur
- Studio de création vidéo.
- Dashboard utilisateur et développeur.
- Crédits, quotas et limites par abonnement.
- Publication/partage des vidéos et intégrations sociales prévues.
- Interface inspirée des usages vidéo courts, sans copier l'identité de TikTok.

## 7. Sécurité
- Authentification et autorisation côté backend.
- Validation des scopes FSK sur chaque endpoint protégé.
- Rate limiting et quotas côté serveur.
- Journalisation sans exposer de secrets.
- Révocation/rotation des clés prévue.

## 8. Règle importante
Toute vraie clé API, clé Stripe, clé fournisseur, secret Netlify ou token OAuth doit être ajouté dans les variables d'environnement/secrets du service concerné, **jamais dans les fichiers du dépôt**.
