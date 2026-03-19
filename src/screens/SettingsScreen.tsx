import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Key, Database, Bot, Cpu, ScanSearch, BrainCircuit } from 'lucide-react';
import { Screen } from '../App';
import { cn } from '../lib/utils';
import { getAIProvider, setAIProvider, getGrokKey, setGrokKey, AIProvider, GROK_MODELS, getDefaultGrokModel, setDefaultGrokModel } from '../config/aiConfig';
import { API_BASE_URL } from '../config/apiUrl';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function SettingsScreen({ onNavigate }: Props) {
  const [apifyKey, setApifyKey] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>(getAIProvider());
  const [grokKey, setGrokKeyInternal] = useState(getGrokKey());
  const [selectedGrokModel, setSelectedGrokModel] = useState(getDefaultGrokModel());
  const [saved, setSaved] = useState(false);
  const [apiCounts, setApiCounts] = useState({ apify: 0, grok: 0 });

  useEffect(() => {
    const key = localStorage.getItem('apify_api_key');
    if (key) setApifyKey(key);

    // Fetch as contagens das chaves diretamente da .env no backend
    fetch(`${API_BASE_URL}/api/config`)
      .then(res => res.json())
      .then(data => {
        setApiCounts({
          apify: data.apifyKeysCount || 0,
          grok: data.grokKeysCount || 0
        });
      })
      .catch(err => console.error("Erro ao buscar contagem de chaves:", err));
  }, []);

  const handleSave = () => {
    localStorage.setItem('apify_api_key', apifyKey);
    setAIProvider(aiProvider);
    setGrokKey(grokKey);
    setDefaultGrokModel(selectedGrokModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#0f0f0f]">
      <header className="sticky top-0 z-20 flex items-center bg-[#0f0f0f]/80 backdrop-blur-md p-4 border-b border-white/5">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        <section className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Central de Inteligência Artificial</h2>
          </div>
          
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Modelo de Inteligência
              </label>
              <div className="relative">
                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <select
                  value={selectedGrokModel}
                  onChange={(e) => setSelectedGrokModel(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-fuchsia-500 transition-colors appearance-none"
                >
                  {GROK_MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                API Key (Grok ou Groq)
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={grokKey}
                  onChange={(e) => setGrokKeyInternal(e.target.value)}
                  placeholder="xai-... ou gsk_..."
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                />
                <p className="mt-1 text-[10px] text-slate-500 italic">Dica: Chaves que começam com 'gsk_' usam automaticamente a API ultrarrápida da Groq.</p>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">Chaves na .env (Server)</span>
                <span className="text-xs text-slate-500">Configuração global detectada</span>
              </div>
              <div className="bg-fuchsia-500/20 text-fuchsia-400 font-mono font-bold px-3 py-1 rounded-lg">
                {apiCounts.grok}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-bold text-white">Integração Apify</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            Insira sua API Key do Apify para buscar dados reais do Instagram (seguidores, bio, posts) automaticamente a partir do @username extraído dos prints.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Apify API Token
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={apifyKey}
                  onChange={(e) => setApifyKey(e.target.value)}
                  placeholder="apify_api_..."
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">Chaves API Configuradas</span>
                <span className="text-xs text-slate-500">Do arquivo .env do backend (round-robin)</span>
              </div>
              <div className="bg-pink-500/20 text-pink-400 font-mono font-bold px-3 py-1 rounded-lg">
                {apiCounts.apify}
              </div>
            </div>
            {apiCounts.apify === 0 && (
              <p className="text-xs text-slate-500 italic">
                Acesse o arquivo <code className="text-pink-400">.env</code> do servidor e adicione chaves na variável APIFY_API_TOKENS para iniciar o rodízio. Caso contrário, use o campo acima.
              </p>
            )}
          </div>
        </section>

        <button
          onClick={() => onNavigate('duplicate_check')}
          className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors mb-4 text-left"
        >
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <ScanSearch className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Verificar Duplicatas</p>
            <p className="text-xs text-slate-400">Cruzar contatos e detectar possíveis duplicados</p>
          </div>
        </button>

        <button
          onClick={handleSave}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
        >
          <Save className="w-5 h-5" />
          {saved ? 'Salvo!' : 'Salvar Configurações'}
        </button>
      </main>
    </div>
  );
}
