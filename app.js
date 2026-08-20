const form = document.querySelector('#videoForm');
const message = document.querySelector('#formMessage');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const prompt = document.querySelector('#prompt')?.value.trim();
  const duration = Number(document.querySelector('#duration')?.value || 5);
  const format = document.querySelector('#format')?.value || '9:16';

  if (!prompt) {
    if (message) message.textContent = 'Décris d’abord la vidéo que tu veux créer.';
    return;
  }

  if (message) message.textContent = '🤖 Préparation de ta vidéo FruityStory…';

  try {
    const response = await fetch('/api/ai-video/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ prompt, duration, aspectRatio: format, provider: 'auto' })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Erreur du moteur vidéo IA');

    sessionStorage.setItem('fruitystory:lastVideoJob', JSON.stringify(data));
    if (message) message.textContent = `✅ Génération lancée. Job : ${data.job?.id || data.externalId || 'créé'}. Ouvre Studio pour suivre son état.`;
  } catch (error) {
    console.error(error);
    if (message) message.textContent = error instanceof Error ? error.message : 'Impossible de lancer la génération vidéo.';
  }
});

const publishButton = document.querySelector('#publishBtn');
publishButton?.addEventListener('click', async () => {
  const privacy = document.querySelector('#privacy')?.value || 'public';
  const job = JSON.parse(sessionStorage.getItem('fruitystory:lastVideoJob') || 'null');
  const videoUrl = job?.job?.output_url || job?.job?.outputUrl;

  if (!videoUrl) {
    alert('Génère ou sélectionne une vidéo avant de publier.');
    return;
  }

  try {
    const response = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ videoUrl, visibility: privacy })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Publication impossible');
    alert('Publication créée avec succès.');
  } catch (error) {
    console.error(error);
    alert(error instanceof Error ? error.message : 'Publication impossible.');
  }
});
