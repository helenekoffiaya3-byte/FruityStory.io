const form = document.querySelector('#videoForm');
const message = document.querySelector('#formMessage');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const prompt = document.querySelector('#prompt')?.value.trim();
  const duration = document.querySelector('#duration')?.value;
  const format = document.querySelector('#format')?.value;

  if (!prompt) {
    if (message) message.textContent = 'Décris d’abord la vidéo que tu veux créer.';
    return;
  }

  if (message) message.textContent = '🤖 Préparation de ton drama FruityStory…';

  try {
    const response = await fetch('/api/ai/story', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, duration, format })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur du moteur IA');

    sessionStorage.setItem('fruitystory:lastStory', JSON.stringify(data));
    if (message) message.textContent = `✅ ${data.scenes?.length || 0} scène(s) préparée(s). Ouvre Studio pour continuer.`;
  } catch (error) {
    console.error(error);
    if (message) message.textContent = 'Le moteur IA n’est pas encore configuré côté fournisseur. Vérifie les variables Netlify.';
  }
});

const publishButton = document.querySelector('#publishBtn');
publishButton?.addEventListener('click', () => {
  const privacy = document.querySelector('#privacy')?.value || 'Tout le monde';
  alert(`Publication préparée — visibilité : ${privacy}.`);
});