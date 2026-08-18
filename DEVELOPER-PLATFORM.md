# FruityStory Developer Platform

## Projets développeur
Chaque développeur peut créer plusieurs projets isolés. Chaque projet possède son environnement `test` ou `production`, ses clés, ses scopes et son usage.

## Types de clés disponibles

- `fs_live_` — clé serveur production
- `fs_test_` — clé serveur de test
- `fs_pk_live_` / `fs_pk_test_` — clé publique
- `fs_sk_live_` / `fs_sk_test_` — clé secrète
- `fs_wh_live_` / `fs_wh_test_` — signature/webhook
- `fs_video_live_` / `fs_video_test_` — génération vidéo
- `fs_image_live_` / `fs_image_test_` — génération image
- `fs_audio_live_` / `fs_audio_test_` — génération audio
- `fs_text_live_` / `fs_text_test_` — génération texte
- `fs_ai_live_` / `fs_ai_test_` — services IA
- `fs_payments_live_` / `fs_payments_test_` — API paiement
- `fs_storage_live_` / `fs_storage_test_` — stockage
- `fs_analytics_live_` / `fs_analytics_test_` — analytics
- `fs_social_live_` / `fs_social_test_` — publication/intégrations sociales
- `fs_admin_live_` / `fs_admin_test_` — administration

Les secrets complets sont affichés une seule fois. GitHub ne contient aucune clé secrète réelle.

## Scopes

`projects:read`, `projects:write`, `keys:read`, `keys:write`, `video:generate`, `video:read`, `image:generate`, `audio:generate`, `text:generate`, `ai:generate`, `payments:read`, `payments:write`, `storage:read`, `storage:write`, `analytics:read`, `social:publish`.

## Architecture

Le gestionnaire est dans `backend/src/developer-platform.ts`. Les secrets sont hachés SHA-256 et stockés dans Netlify Blobs. Les clés peuvent être révoquées et chaque projet possède son propre espace de clés.
