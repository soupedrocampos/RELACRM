import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, GitMerge, Trash2, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { Screen } from '../App';
import { Contact } from '../types';
import { useContacts } from '../context/ContactsContext';
import { cn } from '../lib/utils';
import { get, set } from 'idb-keyval';

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
}

interface DuplicatePair {
  a: Contact;
  b: Contact;
  score: number; // 0-100 confidence of being same person
  reasons: string[];
  id: string;
}

function normalize(s?: string | null) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
}

function detectDuplicates(contacts: Contact[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i];
      const b = contacts[j];
      const pairKey = [a.id, b.id].sort().join('-');
      if (seen.has(pairKey)) continue;

      let score = 0;
      const reasons: string[] = [];

      // 1. Same phone (very strong)
      const phoneA = normalize(a.phone);
      const phoneB = normalize(b.phone);
      if (phoneA && phoneB && phoneA === phoneB) {
        score += 60;
        reasons.push('📱 Mesmo telefone');
      }

      // 2. Name / username similarity
      const nameA = normalize(a.name);
      const nameB = normalize(b.name);
      const nameSim = similarity(nameA, nameB);
      if (nameSim === 100) {
        score += 30;
        reasons.push('👤 Nome idêntico');
      } else if (nameSim >= 80) {
        score += 15;
        reasons.push(`👤 Nome parecido (${nameSim}%)`);
      } else if (nameSim >= 60) {
        score += 7;
        reasons.push(`👤 Nome similar (${nameSim}%)`);
      }

      // 3. Same city + same age (moderate signal)
      const cityA = normalize(a.city);
      const cityB = normalize(b.city);
      if (cityA && cityB && cityA === cityB && cityA !== 'desconhecida') {
        if (Math.abs((a.age || 0) - (b.age || 0)) <= 2) {
          score += 15;
          reasons.push('📍 Mesma cidade + idade próxima');
        } else {
          score += 5;
          reasons.push('📍 Mesma cidade');
        }
      }

      // 4. Same platform (weak corroboration)
      if (a.platform === b.platform) {
        score += 5;
      }

      // 5. Same extracted phone
      const extPhoneA = normalize(a.extractedInfo?.phone);
      const extPhoneB = normalize(b.extractedInfo?.phone);
      if (extPhoneA && extPhoneB && extPhoneA === extPhoneB) {
        score += 20;
        reasons.push('📞 Telefone extraído igual');
      }

      if (score >= 30 && reasons.length > 0) {
        seen.add(pairKey);
        pairs.push({ a, b, score: Math.min(score, 100), reasons, id: pairKey });
      }
    }
  }

  return pairs.sort((x, y) => y.score - x.score);
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-red-400 border-red-500/30 bg-red-500/5';
  if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
  return 'text-sky-400 border-sky-500/30 bg-sky-500/5';
}

function scoreLabel(score: number) {
  if (score >= 70) return '⚠️ Muito provável';
  if (score >= 50) return '🔶 Possível';
  return '💡 Suspeito';
}

export function DuplicateCheckScreen({ onNavigate }: Props) {
  const { contacts, updateContact, deleteContact } = useContacts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [merged, setMerged] = useState<Set<string>>(new Set());

  // Load dismissed from IndexedDB on mount
  useEffect(() => {
    get<string[]>('dismissed_pairs').then((data) => {
      if (data) {
        setDismissed(new Set(data));
      }
    });
  }, []);

  const pairs = useMemo(() => detectDuplicates(contacts), [contacts]);
  const activePairs = pairs.filter(p => !dismissed.has(p.id) && !merged.has(p.id));

  const handleMerge = (pair: DuplicatePair) => {
    // Merge B into A: keep A's id, enrich with B's non-empty data
    const a = contacts.find(c => c.id === pair.a.id);
    const b = contacts.find(c => c.id === pair.b.id);
    if (!a || !b) return;

    const merged: Contact = {
      ...a,
      phone: a.phone || b.phone,
      bio: a.bio || b.bio,
      city: a.city !== 'Desconhecida' ? a.city : b.city,
      avatar: a.avatar !== 'https://i.pravatar.cc/150' ? a.avatar : b.avatar,
      prints: [...(a.prints || []), ...(b.prints || [])],
      audioNotes: [...(a.audioNotes || []), ...(b.audioNotes || [])],
      followers: Math.max(a.followers || 0, b.followers || 0),
      following: Math.max(a.following || 0, b.following || 0),
      keyTraits: [...new Set([...(a.keyTraits || []), ...(b.keyTraits || [])])],
      approachTips: [...new Set([...(a.approachTips || []), ...(b.approachTips || [])])],
      redFlags: [...new Set([...(a.redFlags || []), ...(b.redFlags || [])])],
      extractedInfo: {
        zodiacSign: a.extractedInfo?.zodiacSign || b.extractedInfo?.zodiacSign,
        interests: [...new Set([...(a.extractedInfo?.interests || []), ...(b.extractedInfo?.interests || [])])],
        phone: a.extractedInfo?.phone || b.extractedInfo?.phone,
        context: a.extractedInfo?.context || b.extractedInfo?.context,
        rawText: [a.extractedInfo?.rawText, b.extractedInfo?.rawText].filter(Boolean).join('\n---\n'),
        language: a.extractedInfo?.language || b.extractedInfo?.language,
      },
      milestones: {
        phase: {
          kiss: a.milestones?.phase?.kiss || b.milestones?.phase?.kiss,
          drink: a.milestones?.phase?.drink || b.milestones?.phase?.drink,
          skull: a.milestones?.phase?.skull || b.milestones?.phase?.skull,
        },
        info: {
          whatsapp: a.milestones?.info?.whatsapp || b.milestones?.info?.whatsapp,
          map: a.milestones?.info?.map || b.milestones?.info?.map,
          photo: a.milestones?.info?.photo || b.milestones?.info?.photo,
        },
      },
    };

    updateContact(a.id, merged);
    deleteContact(b.id);
    setMerged(prev => new Set([...prev, pair.id]));
  };

  const handleDismiss = (pairId: string) => {
    setDismissed(prev => {
      const next = new Set([...prev, pairId]);
      set('dismissed_pairs', Array.from(next));
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#0f0f0f]">
      <header className="sticky top-0 z-20 flex items-center bg-[#0f0f0f]/80 backdrop-blur-md p-4 border-b border-white/5">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-xl font-bold tracking-tight">Verificar Duplicatas</h1>
          <p className="text-xs text-slate-500">{contacts.length} contatos analisados</p>
        </div>
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-full px-3 py-1 text-xs font-bold text-pink-400">
          {activePairs.length} suspeitos
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-12">
        {activePairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Tudo limpo!</h2>
            <p className="text-slate-400 text-sm max-w-xs">
              Nenhum contato duplicado ou suspeito encontrado entre {contacts.length} registros.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400">
              Encontramos <span className="text-white font-bold">{activePairs.length} pares</span> possivelmente duplicados. Selecione o que fazer com cada um.
            </p>
            {activePairs.map(pair => (
              <div
                key={pair.id}
                className={cn('border rounded-2xl p-4 space-y-4', scoreColor(pair.score))}
              >
                {/* Score badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">
                    {scoreLabel(pair.score)}
                  </span>
                  <span className="text-xs font-bold opacity-70">{pair.score}% match</span>
                </div>

                {/* Reasons */}
                <div className="flex flex-wrap gap-1.5">
                  {pair.reasons.map(r => (
                    <span key={r} className="text-[10px] bg-white/10 text-slate-300 rounded-full px-2 py-0.5 font-medium">{r}</span>
                  ))}
                </div>

                {/* Contact cards side by side */}
                <div className="grid grid-cols-2 gap-3">
                  {[pair.a, pair.b].map(c => (
                    <button
                      key={c.id}
                      onClick={() => onNavigate('contact_details', { contact: c })}
                      className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors text-center"
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white/10"
                      />
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[100px]">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.platform}</p>
                        {c.phone && <p className="text-[10px] text-emerald-400 mt-0.5">{c.phone}</p>}
                        <p className="text-[10px] text-slate-500 mt-0.5">{c.city}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleMerge(pair)}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm py-3 rounded-xl hover:bg-emerald-500/20 transition-all"
                  >
                    <GitMerge className="w-4 h-4" />
                    Mesclar
                  </button>
                  <button
                    onClick={() => handleDismiss(pair.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-400 font-bold text-sm py-3 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Ignorar
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 text-center">Mesclar mantém o primeiro card e absorve os dados do segundo.</p>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
