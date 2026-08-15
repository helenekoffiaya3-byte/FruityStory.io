import { generateStory } from "./services/story-api";

const promptInput = document.getElementById("story-prompt") as HTMLTextAreaElement | null;
const generateButton = document.getElementById("generate-story-btn") as HTMLButtonElement | null;
const statusElement = document.getElementById("story-status");
const resultElement = document.getElementById("story-result");

generateButton?.addEventListener("click", async () => {
  const prompt = promptInput?.value || "";

  if (generateButton) generateButton.disabled = true;
  if (statusElement) statusElement.textContent = "Création du drama...";
  if (resultElement) resultElement.innerHTML = "";

  try {
    const story = await generateStory(prompt);
    if (statusElement) statusElement.textContent = "Drama créé avec succès.";

    if (resultElement) {
      resultElement.innerHTML = `
        <h2>${escapeHtml(story.title)}</h2>
        <h3>Personnages</h3>
        ${story.characters.map((c) => `
          <div class="story-character">
            <h4>${escapeHtml(c.name)}</h4>
            <div><b>Fruit :</b> ${escapeHtml(c.fruit)}</div>
            <div><b>Apparence :</b> ${escapeHtml(c.appearance)}</div>
            <div><b>Vêtements :</b> ${escapeHtml(c.clothing)}</div>
            <div><b>Personnalité :</b> ${escapeHtml(c.personality)}</div>
          </div>
        `).join("")}

        <h3>Scènes</h3>
        ${story.scenes.map((s, i) => `
          <div class="story-scene">
            <h4>Scène ${i + 1} : ${escapeHtml(s.location)}</h4>
            <div>${escapeHtml(s.description)}</div>
            <div>
              ${s.dialogues.map((d) => `
                <div><b>${escapeHtml(d.characterId)}</b> : ${escapeHtml(d.text)}</div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      `;
    }
  } catch (error) {
    if (statusElement) {
      statusElement.textContent = error instanceof Error
        ? error.message
        : "Une erreur est survenue.";
    }
  } finally {
    if (generateButton) generateButton.disabled = false;
  }
});

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
