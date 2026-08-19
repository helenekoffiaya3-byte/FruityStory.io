# Orange Money Côte d'Ivoire — configuration Netlify

Ce document décrit les variables nécessaires à l'intégration Orange Money côté serveur.

## Variables Netlify

Créer ces variables dans Netlify, sans les committer dans GitHub :

```env
ORANGE_MONEY_CLIENT_ID=
ORANGE_MONEY_CLIENT_SECRET=
ORANGE_MONEY_AUTHORIZATION=
ORANGE_MONEY_TOKEN_URL=https://api.orange.com/oauth/v3/token
ORANGE_MONEY_COUNTRY=CI
ORANGE_MONEY_CURRENCY=XOF
```

`ORANGE_MONEY_CLIENT_SECRET` et `ORANGE_MONEY_AUTHORIZATION` sont des secrets. Ne jamais mettre leurs valeurs dans le frontend, dans GitHub ou dans un fichier `.env` commité.

## Où récupérer les identifiants

Dans Orange Developer : **My Apps → FruityStory.io → Credentials**. Utiliser le Client ID, le Client Secret et l'Authorization header fournis pour l'application.

## Flux serveur

Le backend récupère un jeton OAuth avec `client_credentials`, puis utilise le jeton avec l'API Orange Money correspondant au produit activé pour le marchand. Les URL et paramètres de paiement définitifs doivent être ceux fournis par Orange pour l'offre et l'environnement du compte marchand.

## Mise en production

1. Souscrire au service Orange Money Web Payment/M Payment auprès d'Orange Côte d'Ivoire.
2. Créer/valider l'application Orange Developer.
3. Ajouter les variables ci-dessus dans Netlify.
4. Tester avec les identifiants et endpoints de l'environnement fourni par Orange.
5. Ne jamais exposer le Client Secret ou le Basic Authorization header au navigateur.
