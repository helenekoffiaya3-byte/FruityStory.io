# FruityStory.io Backend API

Le backend social est implémenté comme une Netlify Function TypeScript :

- `netlify/functions/api.ts` — routeur API
- `netlify/functions/api-types.ts` — modèles métier
- `netlify/functions/api-store.ts` — service de données de développement
- `netlify/functions/api-providers.ts` — adaptateurs vidéo sécurisés
- `src/api-client.ts` — client frontend

## Routes

`/api/auth/*`, `/api/users/*`, `/api/feed/*`, `/api/videos/*`, `/api/comments/*`, `/api/friends/*`, `/api/notifications/*`, `/api/search/*`, `/api/stories/*`, `/api/playlists/*`, `/api/messages/*`, `/api/studio/*`, `/api/analytics/*`, `/api/promote/*`, `/api/monetization/*`, `/api/payments/*`, `/api/credits/*`, `/api/ai-video/*`, `/api/uploads/*`, `/api/settings/*`, `/api/reports/*`, `/api/moderation/*`.

## Important

Le `api-store.ts` est un **store mémoire de développement** : son contenu est perdu au redémarrage d'une Function. Pour la production, il doit être remplacé par une vraie base de données et un vrai stockage objet. Les endpoints et contrats API peuvent rester identiques.

Les adaptateurs paiement, stockage et fournisseurs vidéo refusent volontairement de fonctionner sans configuration serveur. Les secrets ne sont pas stockés dans GitHub.

## Exemple frontend

```ts
import { socialApi } from './api-client';

const feed = await socialApi.feed();
const result = await socialApi.generateVideo({
  prompt: 'Une mangue et une fraise se disputent dans un restaurant',
  duration: 30,
  aspectRatio: '9:16',
  provider: 'auto'
});
```

## Production

1. Connecter une base de données.
2. Connecter un stockage objet avec uploads signés.
3. Ajouter une authentification réelle avec sessions/JWT et contrôle d'accès serveur.
4. Implémenter les adaptateurs officiels des fournisseurs vidéo choisis.
5. Implémenter un fournisseur de paiement et la vérification de signature des webhooks.
6. Ajouter files/jobs persistants, rate limiting distribué, modération et observabilité.
7. Tester toutes les routes avec le frontend avant de mettre les clés de production.
