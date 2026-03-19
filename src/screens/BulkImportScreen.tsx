import React, { useState, useRef } from 'react';
import { ArrowLeft, Images, Loader2, CheckCircle2, AlertCircle, CheckSquare, Square, RefreshCw, MapPin } from 'lucide-react';
import { Screen } from '../App';
import { useContacts } from '../context/ContactsContext';
import { Contact } from '../types';
import { analyzeProfileWithAI } from '../services/ai';
import { cropImage } from '../lib/utils';
import { fetchAvatarInBackground } from '../services/apifyBackground';
import { saveBase64Image } from '../lib/imageStorage';

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
}

interface FileStatus {
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'success' | 'error';
  errorMsg?: string;
  progressMsg?: string;
  contact?: Contact;
}

  export function BulkImportScreen({ onNavigate }: Props) {
  const { contacts, addContact, updateContact } = useContacts();
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isSinglePerson, setIsSinglePerson] = useState(false);
  const [isTextOnly, setIsTextOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    if (isSinglePerson) {
      // ─── MERGE MODE: all pending images → one contact ───────────────────
      const pendingIndices = files.map((f, i) => f.status === 'pending' ? i : -1).filter(i => i !== -1);
      if (pendingIndices.length === 0) { setIsProcessing(false); return; }

      setFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'analyzing', progressMsg: 'Iniciando análise...' } : f));

      try {
        const base64Images = await Promise.all(pendingIndices.map(i => fileToBase64(files[i].file)));
        const filenames = pendingIndices.map(i => files[i].file.name);

        const result = await analyzeProfileWithAI(base64Images, undefined, JSON.stringify(contacts), (statusMsg) => {
          setFiles(prev => prev.map((f, idx) => pendingIndices.includes(idx) ? { ...f, progressMsg: statusMsg } : f));
        }, filenames, undefined, isTextOnly);

        if (result.success && result.data) {
          const targetContactId = selectedContactId || result.data.existingContactId;
          let avatarUrl = 'https://i.pravatar.cc/150';
          if (result.data.profilePicBoundingBox?.length === 4) {
            avatarUrl = await cropImage(base64Images[0], result.data.profilePicBoundingBox);
          }

          if (targetContactId) {
            const existing = contacts.find(c => c.id === targetContactId);
            if (existing) {
              const newPaths = await Promise.all(base64Images.map(b64 => saveBase64Image(existing.id, b64)));
              const updated = { ...existing, prints: [...newPaths, ...existing.prints], bio: result.data.bio || existing.bio, avatar: avatarUrl !== 'https://i.pravatar.cc/150' ? avatarUrl : existing.avatar };
              updateContact(existing.id, updated);
              fetchAvatarInBackground(existing.id, result.data.username || '', result.data.platform || '', updateContact);
              setFiles(prev => prev.map((f, idx) => pendingIndices.includes(idx) ? { ...f, status: 'success', contact: updated } : f));
              setIsProcessing(false);
              return;
            }
          }

          const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const newPaths = await Promise.all(base64Images.map(b64 => saveBase64Image(newId, b64)));
          const newContact: Contact = {
            id: newId,
            name: result.data.username || 'Desconhecido',
            age: result.data.age || 25, city: result.data.city || 'Desconhecida',
            platform: result.data.platform || 'Instagram', avatar: avatarUrl,
            followers: result.data.followers || 0, following: result.data.following || 0,
            popularity: result.data.popularity || 'Média', personalityType: result.data.personalityType || 'Desconhecida',
            vanityIndex: result.data.vanityIndex || 5, opennessIndex: result.data.opennessIndex || 5,
            libidoIndex: result.data.libidoIndex || 5, financialExpectationIndex: result.data.financialExpectationIndex || 5,
            jealousyIndex: result.data.jealousyIndex || 5, accessibilityIndex: result.data.accessibilityIndex || 5,
            emotionalDependencyIndex: result.data.emotionalDependencyIndex || 5,
            profileType: result.data.profileType || 'Comum', keyTraits: result.data.keyTraits || [],
            approachTips: result.data.approachTips || [], redFlags: result.data.redFlags || [],
            summary: result.data.summary || '', sexualOpenness: result.data.sexualOpenness || '',
            behavioralAnalysis: result.data.behavioralAnalysis || '', photoCount: result.data.postsCount || 0,
            milestones: { phase: { kiss: false, drink: false, skull: false }, info: { whatsapp: false, map: false, photo: false } }, lastInteractionDays: 0,
            bio: result.data.bio || '', phone: result.data.phone || '',
            prints: newPaths, audioNotes: [],
            extractedInfo: { zodiacSign: result.data.zodiacSign, interests: result.data.interests, phone: result.data.phone, context: result.data.context, rawText: result.data.rawText, language: result.data.language },
            createdAt: new Date().toISOString(),
            lastAnalyzedAt: new Date().toISOString()
          };
          addContact(newContact);
          fetchAvatarInBackground(newContact.id, result.data.username || '', result.data.platform || '', updateContact);
          setFiles(prev => prev.map((f, idx) => pendingIndices.includes(idx) ? { ...f, status: 'success', contact: newContact } : f));
        } else {
          setFiles(prev => prev.map((f, idx) => pendingIndices.includes(idx) ? { ...f, status: 'error', errorMsg: result.error || 'Erro desconhecido' } : f));
        }
      } catch (error: any) {
        setFiles(prev => prev.map((f, idx) => pendingIndices.includes(idx) ? { ...f, status: 'error', errorMsg: error.message || 'Falha na conexão' } : f));
      }

    } else {
      // ─── INDIVIDUAL MODE: one card per image ────────────────────────────
      // Only use the user-selected contact to merge; NEVER auto-merge via AI existingContactId
      for (let i = 0; i < files.length; i++) {
        if (files[i].status !== 'pending') continue;

        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'analyzing', progressMsg: 'Iniciando análise...' } : f));

        try {
          const base64 = await fileToBase64(files[i].file);
          const filename = files[i].file.name;

          const result = await analyzeProfileWithAI([base64], undefined, JSON.stringify(contacts), (statusMsg) => {
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progressMsg: statusMsg } : f));
          }, [filename], undefined, isTextOnly);

          if (result.success && result.data) {
            let avatarUrl = 'https://i.pravatar.cc/150';
            if (result.data.profilePicBoundingBox?.length === 4) {
              avatarUrl = await cropImage(base64, result.data.profilePicBoundingBox);
            }

            if (selectedContactId) {
              // User explicitly chose to add to an existing contact
              const existing = contacts.find(c => c.id === selectedContactId);
              if (existing) {
                const updated = {
                  ...existing,
                  prints: [await saveBase64Image(existing.id, base64), ...existing.prints],
                  bio: result.data.bio || existing.bio,
                  avatar: avatarUrl !== 'https://i.pravatar.cc/150' ? avatarUrl : existing.avatar,
                };
                updateContact(existing.id, updated);
                fetchAvatarInBackground(existing.id, result.data.username || '', result.data.platform || '', updateContact);
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'success', contact: updated } : f));
                continue;
              }
            }

            // Default: always create a NEW card for each image
            const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const savedPath = await saveBase64Image(newId, base64);
            const newContact: Contact = {
              id: newId,
              name: result.data.username || 'Desconhecido',
              age: result.data.age || 25, city: result.data.city || 'Desconhecida',
              platform: result.data.platform || 'Instagram', avatar: avatarUrl,
              followers: result.data.followers || 0, following: result.data.following || 0,
              popularity: result.data.popularity || 'Média', personalityType: result.data.personalityType || 'Desconhecida',
              vanityIndex: result.data.vanityIndex || 5, opennessIndex: result.data.opennessIndex || 5,
              libidoIndex: result.data.libidoIndex || 5, financialExpectationIndex: result.data.financialExpectationIndex || 5,
              jealousyIndex: result.data.jealousyIndex || 5, accessibilityIndex: result.data.accessibilityIndex || 5,
              emotionalDependencyIndex: result.data.emotionalDependencyIndex || 5,
              profileType: result.data.profileType || 'Comum', keyTraits: result.data.keyTraits || [],
              approachTips: result.data.approachTips || [], redFlags: result.data.redFlags || [],
              summary: result.data.summary || '', sexualOpenness: result.data.sexualOpenness || '',
              behavioralAnalysis: result.data.behavioralAnalysis || '', photoCount: result.data.postsCount || 0,
              milestones: { phase: { kiss: false, drink: false, skull: false }, info: { whatsapp: false, map: false, photo: false } }, lastInteractionDays: 0,
              bio: result.data.bio || '', phone: result.data.phone || '',
              prints: [savedPath], audioNotes: [],
              extractedInfo: { zodiacSign: result.data.zodiacSign, interests: result.data.interests, phone: result.data.phone, context: result.data.context, rawText: result.data.rawText, language: result.data.language },
              createdAt: new Date().toISOString(),
              lastAnalyzedAt: new Date().toISOString()
            };

            // Add immediately so it appears in real-time on the HomeScreen
            addContact(newContact);
            fetchAvatarInBackground(newContact.id, result.data.username || '', result.data.platform || '', updateContact);
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'success', contact: newContact } : f));
          } else {
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', errorMsg: result.error || 'Erro desconhecido' } : f));
          }
        } catch (error: any) {
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', errorMsg: error.message || 'Falha na conexão' } : f));
        }
      }
    }

    setIsProcessing(false);
  };


  const retryFile = (index: number) => {
    if (isProcessing) return;
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'pending', errorMsg: undefined, progressMsg: undefined } : f));
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#0f0f0f]">
      <header className="sticky top-0 z-20 flex items-center bg-[#0f0f0f]/80 backdrop-blur-md p-4 border-b border-white/5">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-xl font-bold tracking-tight">Importar Prints</h1>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col">
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mb-6">
              <Images className="w-10 h-10 text-pink-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Importação em Lote</h2>
            <p className="text-slate-400 text-sm max-w-xs mb-8">
              Selecione vários prints de perfis do Instagram. A IA irá analisar todos e criar os contatos automaticamente.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-pink-500 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:bg-pink-600 transition-all"
            >
              Selecionar Imagens
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Fila de Processamento</h2>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="text-pink-500 text-sm font-bold disabled:opacity-50"
              >
                + Adicionar mais
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Vincular prints a um contato existente (Opcional)
              </label>
              <select
                value={selectedContactId || ''}
                onChange={(e) => setSelectedContactId(e.target.value || null)}
                disabled={isProcessing}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500 disabled:opacity-50"
              >
                <option value="">-- Criar novos contatos / Auto-detectar --</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.platform})</option>
                ))}
              </select>
              {selectedContactId && (
                <p className="text-xs text-pink-500 mt-2">
                  Todas as imagens abaixo serão adicionadas ao perfil de {contacts.find(c => c.id === selectedContactId)?.name}.
                </p>
              )}
            </div>

            <div className="mb-6">
              <button 
                onClick={() => setIsSinglePerson(!isSinglePerson)}
                disabled={isProcessing}
                className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isSinglePerson ? (
                  <CheckSquare className="w-6 h-6 text-pink-500 flex-shrink-0" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-bold text-white">Todos os prints são da mesma pessoa</p>
                  <p className="text-xs text-slate-400 mt-1">
                    A IA analisará todas as imagens juntas para criar um perfil psicológico mais profundo e agrupará tudo em um único contato.
                  </p>
                </div>
              </button>

              <button 
                onClick={() => setIsTextOnly(!isTextOnly)}
                disabled={isProcessing}
                className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 transition-colors disabled:opacity-50 mt-4"
              >
                {isTextOnly ? (
                  <CheckSquare className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-bold text-white">Modo Economia (Apenas Texto)</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Usa OCR local para extrair o texto e enviar para a IA sem imagens. Economiza tokens e bateria (ideal para conversas).
                  </p>
                </div>
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pb-24">
              {files.map((file, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-4">
                  <img src={file.preview} alt="Preview" className="w-12 h-16 object-cover rounded-lg border border-white/10" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{file.file.name}</p>
                    {file.status === 'pending' && <p className="text-xs text-slate-400">Aguardando...</p>}
                    {file.status === 'analyzing' && <p className="text-xs text-pink-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> {file.progressMsg || 'Analisando...'}</p>}
                    {file.status === 'success' && (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-emerald-400 font-bold items-center gap-1 flex">
                          <CheckCircle2 className="w-3 h-3"/> @{file.contact?.name}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <input 
                            type="text" 
                            value={file.contact?.city || ''} 
                            onChange={(e) => {
                              if (!file.contact) return;
                              const newCity = e.target.value;
                              const updated = { ...file.contact, city: newCity };
                              updateContact(file.contact.id, updated);
                              setFiles(prev => prev.map((f, i) => i === idx ? { ...f, contact: updated } : f));
                            }}
                            className="bg-transparent border-b border-white/10 focus:border-pink-500 outline-none w-24 truncate"
                            placeholder="Cidade..."
                          />
                        </div>
                      </div>
                    )}
                    {file.status === 'error' && <p className="text-xs text-red-400 truncate">{file.errorMsg}</p>}
                  </div>

                  <div>
                    {file.status === 'pending' && <div className="w-6 h-6 rounded-full border-2 border-slate-600"></div>}
                    {file.status === 'analyzing' && <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />}
                    {file.status === 'success' && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <button 
                          onClick={() => onNavigate('contact_details', { contact: file.contact, from: 'bulk_import' })}
                          className="bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-bold px-3 py-1 rounded-full transition-colors shrink-0"
                        >
                          Ver Cartão
                        </button>
                      </div>
                    )}
                    {file.status === 'error' && (
                      <button 
                        onClick={() => retryFile(idx)} 
                        disabled={isProcessing}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-full transition-colors group flex items-center justify-center shrink-0 disabled:opacity-50"
                        title="Tentar Novamente"
                      >
                        <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-0 left-0 w-full p-6 bg-[#0f0f0f]/90 backdrop-blur-xl border-t border-white/10">
              {pendingCount > 0 ? (
                <button 
                  onClick={processFiles}
                  disabled={isProcessing}
                  className="w-full bg-pink-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:bg-pink-600 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                  ) : (
                    `Processar ${pendingCount} imagem(ns)`
                  )}
                </button>
              ) : (
                <button 
                  onClick={() => onNavigate('home')}
                  className="w-full bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition-all"
                >
                  Voltar para Home ({successCount} contatos criados)
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
