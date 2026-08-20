const form = document.querySelector('#videoForm');
const message = document.querySelector('#formMessage');

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Erreur API (${response.status})`);
  return data;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const prompt = document.querySelector('#prompt')?.value.trim();
  const duration = Number(document.querySelector('#duration')?.value || 5);
  const aspectRatio = document.querySelector('#format')?.value || '9:16';
  if (!prompt) return void (message && (message.textContent = 'Décris d’abord la vidéo que tu veux créer.'));
  if (message) message.textContent = '🤖 Vérification de ton compte et de tes crédits…';
  try {
    const credits = await api('/api/credits');
    if (Number(credits.balance) < 150) throw new Error(`Crédits insuffisants : 150 crédits sont nécessaires. Solde : ${credits.balance}.`);
    if (message) message.textContent = '🎬 Lancement de la génération (150 crédits)…';
    const data = await api('/api/ai-video/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, duration, aspectRatio, provider: 'auto' })
    });
    sessionStorage.setItem('fruitystory:lastVideoJob', JSON.stringify(data));
    if (message) message.textContent = `✅ Génération lancée. Job : ${data.job?.id || data.externalId || 'créé'}.`;
  } catch (error) {
    console.error(error);
    if (message) message.textContent = error instanceof Error ? error.message : 'Impossible de lancer la génération vidéo.';
  }
});

const publishButton = document.querySelector('#publishBtn');
publishButton?.addEventListener('click', async () => {
  const job = JSON.parse(sessionStorage.getItem('fruitystory:lastVideoJob') || 'null');
  const videoUrl = job?.job?.output_url || job?.job?.outputUrl;
  if (!videoUrl) return void alert('La vidéo n’est pas encore prête. Attends la fin de la génération.');
  try {
    const data = await api('/api/videos', {
      method: 'POST',
      body: JSON.stringify({ videoUrl, visibility: document.querySelector('#privacy')?.value || 'public' })
    });
    alert(`Vidéo publiée : ${data.video?.id || 'OK'}`);
  } catch (error) {
    console.error(error);
    alert(error instanceof Error ? error.message : 'Publication impossible.');
  }
});
