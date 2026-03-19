export type AIProvider = 'grok';

export const getAIProvider = (): AIProvider => {
  return 'grok';
};

export const setAIProvider = (provider: AIProvider) => {
  localStorage.setItem('relacrm_ai_provider', 'grok');
};

let currentGrokIndex = 0;

export const getGrokKey = (): string => {
  const localKey = localStorage.getItem('relacrm_grok_key');
  if (localKey && localKey.trim()) return localKey;

  const envKeys = (import.meta as any).env?.GROQ_API_KEY || (import.meta as any).env?.GROK_API_KEY || "";
  const keys = envKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  
  if (keys.length === 0) return "";
  
  const key = keys[currentGrokIndex];
  currentGrokIndex = (currentGrokIndex + 1) % keys.length;
  return key;
};

let currentGeminiIndex = 0;

export const getAllGeminiKeys = (): string[] => {
  const envKeys = (import.meta as any).env?.GEMINI_API_KEY || "";
  return envKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
};

export const getNextGeminiKey = (): string | null => {
  const keys = getAllGeminiKeys();
  if (keys.length === 0) return null;
  const key = keys[currentGeminiIndex % keys.length];
  currentGeminiIndex++;
  return key;
};

// Auxiliary to update global gemini index when a key fails with 429
export const overrideGeminiIndex = (newIndex: number) => {
  currentGeminiIndex = newIndex;
};
export const getGeminiIndex = () => currentGeminiIndex;

export const setGrokKey = (key: string) => {
  localStorage.setItem('relacrm_grok_key', key);
};

export const GROK_MODELS = [
  { id: 'grok-beta', name: 'Grok Beta' },
  { id: 'grok-vision-beta', name: 'Grok Vision Beta' }
];

export const getDefaultGrokModel = (): string => {
  return localStorage.getItem('relacrm_grok_model') || 'grok-beta';
};

export const setDefaultGrokModel = (modelId: string) => {
  localStorage.setItem('relacrm_grok_model', modelId);
};
