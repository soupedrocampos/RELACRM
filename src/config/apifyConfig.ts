/**
 * Configurações da API do Apify
 * 
 * Adicione suas chaves de API do Apify no array abaixo para uso no Antigravity.
 * O sistema fará um rodízio (round-robin) entre elas a cada requisição para evitar limites de cota.
 */
export const CUSTOM_APIFY_KEYS: string[] = [
  // Adicione suas chaves aqui:
  // "apify_api_SuaChave1...",
  // "apify_api_SuaChave2..."
];

let currentKeyIndex = 0;

export const getApifyKey = (): string | null => {
  if (CUSTOM_APIFY_KEYS.length > 0) {
    const key = CUSTOM_APIFY_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % CUSTOM_APIFY_KEYS.length;
    return key;
  }
  
  const envKeysString = process.env.APIFY_API_TOKENS || "";
  const envTokens = envKeysString.split(',').map(t => t.trim()).filter(t => t.length > 0);
  
  if (envTokens.length > 0) {
    const key = envTokens[currentKeyIndex % envTokens.length];
    currentKeyIndex = (currentKeyIndex + 1) % envTokens.length;
    return key;
  }

  // Fallback para a chave salva na interface (localStorage)
  return localStorage.getItem('apify_api_key');
};
