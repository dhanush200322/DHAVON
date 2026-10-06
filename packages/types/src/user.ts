export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  mindsetPhrase: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  activeAiProvider: 'gemini' | 'anthropic' | 'openai' | 'ollama';
  aiModelName: string;
  temperature: number;
  voicePreset: string;
  observatory: {
    orbIntensity: number;
    particleDensity: number;
    soundEffectsEnabled: boolean;
    ambientLighting: 'cinematic' | 'minimal' | 'high_contrast';
  };
}
