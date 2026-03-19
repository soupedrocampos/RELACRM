import { fetchInstagramProfile } from './apify';
import { getApifyKey } from '../config/apifyConfig';
import { extractTextLocally } from '../lib/ocr';
import { getImageBase64 } from '../lib/imageStorage';
import { getAIProvider, getGrokKey, getDefaultGrokModel, getAllGeminiKeys, getNextGeminiKey, getGeminiIndex, overrideGeminiIndex } from '../config/aiConfig';

async function compressImage(base64DataUri: string, maxWidth = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64DataUri;
  });
}

async function callGrok(prompt: string, images?: string[]) {
  const apiKey = getGrokKey();
  if (!apiKey) throw new Error("Grok API Key não configurada.");

  const messages: any[] = [
    {
      role: "system",
      content: "Você é um especialista em psicologia comportamental e análise de perfis sociais. Responda APENAS com o JSON solicitado."
    },
    {
      role: "user",
      content: (images && images.length > 0)
        ? [
            { type: "text", text: prompt },
            ...images.map(img => ({
              type: "image_url",
              image_url: { url: img }
            }))
          ]
        : prompt
    }
  ];

  try {
  const isGroq = apiKey.startsWith('gsk_');
  const url = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.xai.com/v1/chat/completions";
  const defaultModel = isGroq ? "llama-3.3-70b-versatile" : getDefaultGrokModel();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: images && images.length > 0 && isGroq ? "meta-llama/llama-4-scout-17b-16e-instruct" : defaultModel,
      messages,
      temperature: 0.2,
    })
  });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Erro na API do Grok");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON if it's wrapped in markdown
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        return jsonMatch[1];
      }
    }
    
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  } catch (e: any) {
    console.error("[Grok] Error:", e);
    throw e;
  }
}

async function extractUsername(imageUri: string) {
  try {
    const data = await callGrok(`Extraia o @username deste print. Retorne JSON: {"username": string, "platform": string}`, [imageUri]);
    return data;
  } catch (e) {
    return null;
  }
}

import { API_BASE_URL } from '../config/apiUrl';

// ─── ESTÁGIO 1: Groq Vision OCR Client-Side ────────────────────────────────────
async function extractTextWithGroq(imageBase64DataUri: string, onProgress?: (s: string) => void): Promise<string> {
  const apiKey = getGrokKey();
  if (!apiKey) throw new Error("Chave Groq não configurada no .env");
  const isGroq = apiKey.startsWith('gsk_');

  if (!isGroq) {
    throw new Error("Para usar o OCR Vision é necessário configurar uma chave da Groq (gsk_...)");
  }

  onProgress?.("Extraindo texto por imagem (Groq Vision)...");
  console.log("[Groq OCR API] Iniciando extração com Llama 3.2 11b Vision...");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia TODO o texto visível nesta imagem com máxima fidelidade. Inclua nomes de usuário, bio, número de seguidores, posts, seguindo, e qualquer texto de destaque. Mantenha a estrutura e formatação original. Não adicione interpretações, apenas o texto bruto." },
            { type: "image_url", image_url: { url: imageBase64DataUri } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Groq OCR falhou: ${error?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq não retornou texto da imagem");

  return text;
}

export async function analyzeProfileWithAI(
  imagesBase64DataUri: string | string[], 
  providedUsername?: string, 
  existingContactsContext?: string, 
  onProgress?: (status: string) => void, 
  filenames?: string[],
  targetContactContext?: string,
  textOnlyMode = false
) {
  const images = Array.isArray(imagesBase64DataUri) ? imagesBase64DataUri : [imagesBase64DataUri];
  
  try {
    let textToAnalyze = "";

    // Estágio 1: OCR com Groq
    if (!textOnlyMode && images.length > 0) {
      onProgress?.("Extraindo informações da imagem (Groq)...");
      textToAnalyze = await extractTextWithGroq(images[0], onProgress);
      console.log("[Client Pipeline] Texto extraído com sucesso:", textToAnalyze.substring(0, 150) + "...");
    } else {
      textToAnalyze = images[0] || ""; // Caso textOnlyMode seja usado, passamos o texto direto
    }

    // Estágio 2: Análise Psicológica com Groq
    onProgress?.("Analisando perfil psicologicamente (Groq)...");
    const prompt = `Você é o "Antigravity AI", um mestre em leitura fria e psicologia evolutiva.
Analise o seguinte conteúdo extraído de um perfil de rede social e crie um perfil completo para um CRM de relacionamentos.

CONTEÚDO EXTRAÍDO DA IMAGEM:
---
${textToAnalyze}
---
${providedUsername ? `Nome de usuário informado: ${providedUsername}` : ""}

Seja direto, perspicaz e realista. Estime valores numéricos com base nos dados disponíveis.

Retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem explicações):
{
  "username": "string (nome de usuário ou vazio se não encontrado)",
  "followersCount": "number (0 se não encontrado)",
  "followsCount": "number (0 se não encontrado)",
  "postsCount": "number (0 se não encontrado)",
  "biography": "string (bio do perfil ou vazio)",
  "age": "number (estimativa baseada no perfil, 0 se impossível estimar)",
  "city": "string (cidade ou vazio)",
  "platform": "string (Instagram, TikTok, Twitter, etc - deduza pela interface)",
  "personalityType": "string (ex: Extrovertida Hedonista, Introvertida Analítica, etc)",
  "popularity": "string (Micro, Nano, Médio, Macro, Mega)",
  "vanityIndex": "number de 0 a 100",
  "opennessIndex": "number de 0 a 100",
  "libidoIndex": "number de 0 a 100",
  "financialExpectationIndex": "number de 0 a 100",
  "accessibilityIndex": "number de 0 a 100",
  "profileType": "string (ex: Influenciadora, Pessoa Comum, Artista, etc)",
  "keyTraits": ["array de 3 a 5 traços de personalidade principais"],
  "approachTips": ["array de 3 dicas práticas de abordagem"],
  "redFlags": ["array de 0 a 3 red flags identificados"],
  "summary": "string (resumo executivo de 2-3 frases diretas sobre o perfil)"
}`;

    const data = await callGrok(prompt);
    
    // Fallbacks para manter a compatibilidade da interface
    const responseData = typeof data === "string" ? JSON.parse(data) : data;
    const formattedData = formatAIResponse(responseData, providedUsername).data;
    
    return { success: true, data: formattedData };

  } catch (error: any) {
    console.error("[Client Pipeline Error]:", error);
    return { success: false, error: error.message };
  }
}

function formatAIResponse(data: any, providedUsername?: string) {
  return {
    success: true,
    data: {
      username: providedUsername || data.username || "Desconhecido",
      followers: data.followersCount || 0,
      following: data.followsCount || 0,
      bio: data.biography || "",
      postsCount: data.postsCount || 0,
      age: data.age || 25,
      city: data.city || "Desconhecida",
      platform: data.platform || "Desconhecida",
      personalityType: data.personalityType,
      popularity: data.popularity,
      vanityIndex: data.vanityIndex,
      opennessIndex: data.opennessIndex,
      libidoIndex: data.libidoIndex || 5,
      financialExpectationIndex: data.financialExpectationIndex || 5,
      jealousyIndex: data.jealousyIndex || 5,
      accessibilityIndex: data.accessibilityIndex || 5,
      emotionalDependencyIndex: data.emotionalDependencyIndex || 5,
      profileType: data.profileType,
      keyTraits: data.keyTraits || [],
      approachTips: data.approachTips || [],
      redFlags: data.redFlags || [],
      summary: data.summary || "",
      sexualOpenness: data.sexualOpenness || "",
      behavioralAnalysis: data.behavioralAnalysis || "",
      profilePicBoundingBox: data.profilePicBoundingBox || [],
      existingContactId: data.existingContactId || null,
      zodiacSign: data.zodiacSign || "",
      interests: data.interests || [],
      phone: data.phone || "",
      context: data.context || "",
      rawText: data.rawText || "",
      language: data.language || "Desconhecido"
    }
  } as { success: true; data: any; error?: string };
}

export async function chatWithAssistant(message: string, contactsContext: string) {
  const prompt = `Você é um assistente de CRM pessoal de relacionamentos. Contexto: ${contactsContext}. Usuário: ${message}`;
  
  try {
    const data = await callGrok(prompt);
    const reply = typeof data === 'string' ? data : (data.reply || data.content || JSON.stringify(data));
    return { success: true, reply };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function suggestMessage(contactContext: string) {
  const prompt = `Gere uma sugestão de mensagem curta e casual para este contato: ${contactContext}. Retorne apenas a mensagem.`;

  try {
    const data = await callGrok(prompt);
    const suggestion = typeof data === 'string' ? data : (data.suggestion || data.content || JSON.stringify(data));
    return { success: true, suggestion };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function analyzeAudioTranscription(currentFluxo: string, transcription: string) {
  const prompt = `Mescle esta nova transcrição no fluxo do contato. Fluxo: ${currentFluxo}. Transcrição: ${transcription}. Retorne apenas o texto final.`;
  
  try {
    const data = await callGrok(prompt);
    const updatedFluxo = typeof data === 'string' ? data : (data.updatedFluxo || data.content || JSON.stringify(data));
    return { success: true, data: updatedFluxo };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function analyzeWhatsAppChat(currentFluxo: string, chatText: string) {
  const prompt = `Extraia fatos novos da conversa de WhatsApp e mescle no Fluxo. Fluxo: ${currentFluxo}. Conversa: ${chatText.slice(-4000)}`;
  
  try {
    const data = await callGrok(prompt);
    const updatedFluxo = typeof data === 'string' ? data : (data.updatedFluxo || data.content || JSON.stringify(data));
    return { success: true, data: updatedFluxo };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
