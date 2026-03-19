# Exxxxplica.md - Histórico de Ações (RELACRM)

Este arquivo é um registro contínuo de todas as modificações, implementações e resoluções de problemas feitas neste projeto.

---

## 1. Inicialização Local e Resolução de Conflitos de Porta (14/03/2026)

* **Objetivo:** Rodar a aplicação (`npm run dev`) localmente.
* **Problema:** O terminal afirmava que o servidor havia sido iniciado na porta 3000, mas o navegador retornava `Cannot GET /`.
* **Causa:** Havia um processo antigo (fantasma) em plano de fundo acessando a porta `3000` na interface IPv6 (`::1`), impedindo o servidor atual (que estava vinculado apenas à `0.0.0.0` no IPv4) de receber as requisições.
* **Solução:**
  * Matei o processo antigo no terminal.
  * Modifiquei o arquivo `server.ts` alterando `app.listen(PORT, "0.0.0.0", ...)` para `app.listen(PORT, ...)` de forma que o Node passasse a escutar em **todas as interfaces** (ambos IPv4 e IPv6).

## 2. Implementação do Sistema de Rodízio (Round-Robin) para o Gemini

* **Objetivo:** Permitir o uso de múltiplas chaves API do Google Gemini para evitar limites de requisição (rate limit).
* **Modificações:**
  * **`server.ts`**: Criei a função `getNextGeminiToken()` seguindo a mesma estrutura que o projeto já possuía para o Apify (`getNextApifyToken()`).
  * **`server.ts`**: Alterei a chamada de instanciação da IA (linha ~94) de `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })` para `new GoogleGenAI({ apiKey: getNextGeminiToken() })`.
  * **`.env` e `.env.example`**: Atualizei os arquivos para o padrão plural, criando a nova variável de ambiente `GEMINI_API_KEYS="chave_1,chave_2,chave_3,chave_4"`.

## 3. Correção de Erro "API Key must be set" no Frontend (14/03/2026)

* **Objetivo:** Resolver o erro `An API Key must be set when running in a browser` ocorrido ao testar a aplicação no navegador.
* **Problema:** O frontend estava tentando ler a chave diretamente através de `process.env.GEMINI_API_KEY`, arquivo não estava acessível ou não foi injetado (Vite) na chamada com múltiplas chaves.
* **Causa:** O código no frontend em `src/services/gemini.ts` instaciava o `GoogleGenAI` chamando diretamente `process.env.GEMINI_API_KEY`, em vez da função auxiliar `getGeminiKey()` (que foi atualizada para puxar múltiplas chaves).
* **Solução:**
  * Altei todas as instâncias em `src/services/gemini.ts` onde ocorria `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })` para usar a função `getGeminiKey()`.
  * Atualizei a lógica interna de `src/config/geminiConfig.ts` para ler as propriedades injetadas pelo Vite via `process.env.GEMINI_API_KEYS` caso disponíveis no ambiente do browser.

## 4. Unificação da Lógica de Chaves do Apify e UI (14/03/2026)

* **Objetivo:** Fazer o Frontend ler as chaves do Apify diretamente do arquivo `.env` gerando uma única fonte de verdade.
* **Problema:** O painel lia chaves de arrays fixos, e o Apify lia apenas do LocalStorage (ignorando o `.env`).
* **Solução:**
  * Criei a rota `/api/config` para fornecer a quantidade correta de chaves ao React.
  * Injetamos `APIFY_API_TOKENS` no `vite.config.ts`.
  * O arquivo `apifyConfig.ts` foi atualizado para fazer fallback com as chaves do `.env`.

## 5. Correção de Bug de Responsividade Mobile (14/03/2026)

* **Objetivo:** Evitar que a interface desapareça / quebre ao redimensionar para dispositivos móveis no DevTools ou no celular.
* **Problema:** O usuário relatou que, ao alternar para a visualização mobile, tudo que estava na tela sumia. Isso é tipicamente causado pelo "vazamento" de algum elemento horizontal, forçando o navegador mobile a afastar o zoom para fora da página.
* **Solução:**
  * Adicionei as classes restritivas `w-full max-w-[100vw] overflow-x-hidden` diretamente nos containeres globais (`App.tsx`, `HomeScreen.tsx`, `CityContactsScreen.tsx`, etc.). Isso previne vazamentos garantindo que NADA ultrapasse a largura da tela independentemente do conteúdo.
