export interface StoryCharacter {
  id: string;
  name: string;
  fruit: string;
  appearance: string;
  body: string;
  clothing: string;
  personality: string;
}

export interface StoryDialogue {
  characterId: string;
  text: string;
  emotion: string;
}

export interface StoryScene {
  id: string;
  location: string;
  time: string;
  description: string;
  characters: string[];
  actions: string[];
  dialogues: StoryDialogue[];
  continuity: string;
}

export interface Story {
  title: string;
  characters: StoryCharacter[];
  scenes: StoryScene[];
}

interface GenerateStoryResponse {
  success: boolean;
  story?: Story;
  error?: string;
}

export async function generateStory(prompt: string): Promise<Story> {
  const cleanPrompt = prompt.trim();

  if (!cleanPrompt) {
    throw new Error("Décris le drama que tu veux créer.");
  }

  const response = await fetch("/.netlify/functions/generate-story", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: cleanPrompt }),
  });

  let data: GenerateStoryResponse;

  try {
    data = await response.json();
  } catch {
    throw new Error("Le serveur a renvoyé une réponse invalide.");
  }

  if (!response.ok || !data.success || !data.story) {
    throw new Error(data.error || "Impossible de générer le drama.");
  }

  return data.story;
}
