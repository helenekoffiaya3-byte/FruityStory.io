# FruityStory Provider API

FruityStory exposes a server-side API facade for AI video generation. Client applications never receive provider secrets such as `GEMINI_API_KEY` or `PIXVERSE_API_KEY`.

## Authentication

Send a FruityStory server-issued API key using either:

```http
Authorization: Bearer <FRUITYSTORY_API_KEY>
```

or:

```http
X-API-Key: <FRUITYSTORY_API_KEY>
```

Configure the key in Netlify as `FRUITYSTORY_API_KEY`. Multiple keys can be configured with `FRUITYSTORY_API_KEYS`, separated by commas.

## Endpoints

### List providers

`GET /api/v1/providers`

Returns the enabled provider families exposed by the API facade.

### Create a video

`POST /api/v1/videos`

Example:

```json
{
  "provider": "veo",
  "prompt": "A cinematic tropical sunset over Abidjan, realistic camera movement",
  "aspectRatio": "16:9",
  "resolution": "720p"
}
```

For PixVerse:

```json
{
  "provider": "pixverse",
  "prompt": "A futuristic African city at night, cinematic",
  "model": "v6",
  "duration": 5,
  "quality": "720p",
  "aspectRatio": "9:16",
  "generateAudio": true
}
```

The endpoint returns `202 Accepted` with a provider job ID. Provider credentials and raw secrets are never returned.

### Check a video job

`GET /api/v1/videos/{jobId}?provider=veo`

or:

`GET /api/v1/videos/{jobId}?provider=pixverse`

## Provider architecture

- **Google Veo**: text-to-video through the existing `providers/veo.ts` adapter.
- **PixVerse**: text-to-video through the existing `providers/pixverse.ts` adapter.
- The public API is a thin authentication and normalization layer; provider keys remain server-side.
- The existing `/api/health/providers` endpoint remains separate and does not expose secrets.

## Important

This API facade does not create customer API keys or subscriptions yet. `FRUITYSTORY_API_KEY(S)` are deployment-level credentials intended for the provider API while account-level API-key management is added later.
