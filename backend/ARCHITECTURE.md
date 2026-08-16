# FruityStory.io backend ↔ frontend contract

## Base URL
The frontend calls `/api/...`. Netlify routes `/api/*` to the `backend` Function.

## Authentication
1. `POST /api/auth/register` with `{username,email,password}` returns `{user,token}`.
2. `POST /api/auth/login` with `{login,password}` returns `{user,token}`.
3. Store the token client-side only as appropriate for the application and send `Authorization: Bearer <token>` to protected APIs.
4. `GET /api/auth/me` resolves the current user.

## Social architecture
- `GET /api/feed` — For You/public feed
- `GET /api/users/:id` — profile
- `POST|DELETE /api/users/:id/follow` — follow relation
- `POST /api/videos` — publish video
- `GET /api/videos/:id` — video detail
- `POST|DELETE /api/videos/:id/like` — like
- `GET|POST /api/videos/:id/comments` — comments
- `GET /api/search?q=` — users/videos/hashtags
- `GET /api/studio` — creator analytics summary
- `GET /api/analytics` — analytics summary
- `GET|POST /api/promote` — Promote campaigns
- `GET /api/credits` — credit balance
- `POST /api/ai-video/generate` — create AI generation job
- `GET /api/ai-video/:id` — generation status
- `GET /api/monetization` — monetization state
- `/api/payments` — payment boundary; real provider must be configured before money/webhooks are accepted.

## Database
`schema.sql` is the persistent relational schema. It replaces the previous in-memory-only prototype for the production backend.

## Important boundary
The backend contains the application architecture and safe integration points. Real provider credentials are supplied only through Netlify environment variables. Provider-specific endpoints/signature algorithms must be implemented from each provider's current official API documentation; they are deliberately not guessed.

## Excluded
LIVE, LIVE Gifts/Diamonds and TikTok Shop are outside FruityStory.io's requested scope.
