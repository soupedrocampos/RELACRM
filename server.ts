import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// ─── Rotação de chaves Groq ───────────────────────────────────────────────────
let currentGroqIndex = 0;

const getNextGroqKey = (): string | null => {
  const envKeys = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || "";
  const keys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  if (keys.length === 0) return null;
  const key = keys[currentGroqIndex % keys.length];
  currentGroqIndex++;
  return key;
};

// ─── Rotação de chaves Gemini ─────────────────────────────────────────────────
let currentGeminiIndex = 0;

const getNextGeminiKey = (): string | null => {
  const envKeys = process.env.GEMINI_API_KEY || "";
  const keys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  if (keys.length === 0) return null;
  const key = keys[currentGeminiIndex % keys.length];
  currentGeminiIndex++;
  return key;
};

// Log keys count for verification
const geminiKeys = (process.env.GEMINI_API_KEY || "").split(',').filter(k => k.trim().length > 0);
const groqKeys = (process.env.GROQ_API_KEY || "").split(',').filter(k => k.trim().length > 0);
console.log(`[Config] Servidor iniciado. Gemini Keys: ${geminiKeys.length}, Groq Keys: ${groqKeys.length}`);

// ─── ESTÁGIO 1: Gemini 2.0 Flash → Extração de texto da imagem (OCR) ─────────
async function extractTextWithGemini(imageBase64DataUri: string): Promise<string> {
  const envKeys = process.env.GEMINI_API_KEY || "";
  const allKeys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  if (allKeys.length === 0) throw new Error("GEMINI_API_KEY não configurada no .env");

  // Extrair mime type e dados base64 do Data URI
  const match = imageBase64DataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) throw new Error("Formato de imagem inválido. Esperado: data:image/...;base64,...");

  const mimeType = match[1];
  const base64Data = match[2];

  let lastError = "";

  // Tenta cada chave em sequência — se uma der 429, passa para a próxima
  for (let i = 0; i < allKeys.length; i++) {
    const apiKey = allKeys[(currentGeminiIndex + i) % allKeys.length];
    console.log(`[Gemini OCR] Tentando chave ${i + 1}/${allKeys.length}...`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Extraia TODO o texto visível nesta imagem com máxima fidelidade. Inclua nomes de usuário, bio, número de seguidores, posts, seguindo, e qualquer texto de destaque. Mantenha a estrutura e formatação original. Não adicione interpretações, apenas o texto bruto."
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    });

    const isQuotaError = response.status === 429 || 
                         (await response.clone().json().catch(() => ({}))).error?.message?.toLowerCase().includes("quota") ||
                         (await response.clone().json().catch(() => ({}))).error?.message?.toLowerCase().includes("limit");

    if (!response.ok) {
      const err = await response.json() as any;
      const errMsg = err?.error?.message || "Erro desconhecido";
      
      if (isQuotaError && i < allKeys.length - 1) {
        lastError = errMsg;
        console.warn(`[Gemini OCR] Chave ${i + 1} falhou (quota/limit). Tentando a próxima...`);
        currentGeminiIndex = (currentGeminiIndex + 1) % allKeys.length;
        continue;
      }
      throw new Error(`Gemini OCR falhou: ${errMsg}`);
    }

    const result = await response.json() as any;
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini não retornou texto da imagem");

    currentGeminiIndex = (currentGeminiIndex + 1) % allKeys.length; // avança para próxima na fila
    console.log("[Gemini OCR] Texto extraído:", text.substring(0, 200) + "...");
    return text;
  }

  // Todas as chaves esgotaram o rate limit
  throw new Error(`Gemini OCR: todas as ${allKeys.length} chave(s) atingiram o rate limit. ${lastError}`);
}

// ─── ESTÁGIO 2: Groq Llama 3.3 70B → Análise psicológica do texto ─────────────
async function analyzeWithGroq(extractedText: string, username?: string): Promise<any> {
  const apiKey = getNextGroqKey();
  if (!apiKey) throw new Error("Nenhuma chave GROQ_API_KEY configurada no .env");

  const prompt = `Você é o "Antigravity AI", um mestre em leitura fria e psicologia evolutiva.
Analise o seguinte conteúdo extraído de um perfil de rede social e crie um perfil completo para um CRM de relacionamentos.

CONTEÚDO EXTRAÍDO DA IMAGEM:
---
${extractedText}
---
${username ? `Nome de usuário informado: ${username}` : ""}

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

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(`Groq análise falhou: ${err.error?.message || "Erro desconhecido"}`);
  }

  const result = await response.json() as any;
  const content = result.choices[0].message.content;
  return JSON.parse(content);
}

// ─── Pipeline Orquestradora Principal ─────────────────────────────────────────
async function analyzeProfileWithAI(imageBase64DataUri: string, username?: string): Promise<any> {
  console.log("[Pipeline] Iniciando análise de perfil...");

  // Estágio 1: OCR com Gemini
  console.log("[Pipeline] Estágio 1: Extraindo texto com Gemini 2.0 Flash...");
  const extractedText = await extractTextWithGemini(imageBase64DataUri);

  // Estágio 2: Análise com Groq
  console.log("[Pipeline] Estágio 2: Analisando perfil com Groq Llama 3.3 70B...");
  const profile = await analyzeWithGroq(extractedText, username);

  console.log("[Pipeline] Análise concluída com sucesso.");
  return profile;
}

// ─── Servidor Express ──────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 4000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/config", (req, res) => {
    const groqKeys = (process.env.GROQ_API_KEY || process.env.GROK_API_KEY || "")
      .split(',').map(t => t.trim()).filter(t => t.length > 0);
    res.json({
      grokKeysCount: groqKeys.length,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      apifyKeysCount: (process.env.APIFY_API_TOKENS || "").split(',').filter(t => t.trim()).length
    });
  });

  app.post("/api/analyze-profile", async (req, res) => {
    try {
      const { imageBase64, username } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 é obrigatório" });
      }
      const analysis = await analyzeProfileWithAI(imageBase64, username);
      res.json({ success: true, data: analysis });
    } catch (error: any) {
      console.error("[Erro na análise]:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor RELACRM rodando na porta ${PORT}`);
    console.log(`🤖 Pipeline: Gemini 2.0 Flash (OCR) → Groq Llama 3.3 70B (análise)`);
    console.log(`🔑 Gemini configurado: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`🔑 Groq configurado: ${!!(process.env.GROQ_API_KEY || process.env.GROK_API_KEY)}`);
  });
}

startServer();
