import type { Handler } from '@netlify/functions';

const MAX_MINUTES = 60;
const ALLOWED_CHUNK_MINUTES = [1, 2, 5, 10, 15, 30, 60];

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });
  let input: any;
  try { input = JSON.parse(event.body ?? '{}'); } catch { return json(400, { error: 'JSON invalide.' }); }

  const totalMinutes = Number(input?.durationMinutes);
  const requestedChunk = Number(input?.chunkMinutes ?? 5);
  if (!Number.isFinite(totalMinutes) || totalMinutes < 1 || totalMinutes > MAX_MINUTES) {
    return json(400, { error: 'La durée totale doit être comprise entre 1 et 60 minutes.' });
  }
  if (!Number.isFinite(requestedChunk) || requestedChunk < 1 || requestedChunk > MAX_MINUTES) {
    return json(400, { error: 'La taille d’un morceau doit être comprise entre 1 et 60 minutes.' });
  }

  const chunkMinutes = ALLOWED_CHUNK_MINUTES.includes(requestedChunk) ? requestedChunk : requestedChunk;
  const count = Math.ceil(totalMinutes / chunkMinutes);
  const chunks = Array.from({ length: count }, (_, i) => {
    const start = i * chunkMinutes;
    const duration = Math.min(chunkMinutes, totalMinutes - start);
    return {
      chunkNumber: i + 1,
      startMinute: start,
      durationMinutes: duration,
      durationSeconds: duration * 60,
      label: `Partie ${i + 1}/${count}`,
      preserveContinuityFromPrevious: i > 0,
      sceneGeneration: {
        targetDurationMinutes: duration,
        providerClipMaxSeconds: 12,
        assemblyRequired: true,
      },
    };
  });

  return json(200, {
    ok: true,
    totalDurationMinutes: totalMinutes,
    chunkMinutes,
    chunkCount: count,
    chunks,
    continuity: {
      enabled: true,
      preserveCharacters: true,
      preserveLocations: true,
      preserveStoryState: true,
      preserveDialogueContext: true,
    },
  });
};

export { handler };
