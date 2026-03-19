import React, { useState } from 'react';
import { Users, FileText, Activity, BrainCircuit, Edit2, Lightbulb, Heart, AlertTriangle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Contact } from '../../types';
import { cn } from '../../lib/utils';

interface AnalysisTabProps {
  contact: Contact;
  updateIndex: (key: string, value: number) => void;
  onAddPrintClick: () => void;
}

export function AnalysisTab({ contact, updateIndex, onAddPrintClick }: AnalysisTabProps) {
  const [isEditingStats, setIsEditingStats] = useState(false);

  // Behavior chart (green)
  const behaviorData = [
    { subject: 'Vaidade', A: (contact?.vanityIndex || 5) * 10, fullMark: 100 },
    { subject: 'Abertura', A: (contact?.opennessIndex || 5) * 10, fullMark: 100 },
    { subject: 'Humor', A: contact?.personalityType === 'Extrovertida' ? 85 : contact?.personalityType === 'Ambiverte' ? 55 : 30, fullMark: 100 },
    { subject: 'Social', A: contact?.popularity === 'Alta' ? 90 : contact?.popularity === 'Média' ? 50 : 20, fullMark: 100 },
    { subject: 'Rotina', A: contact?.profileType === 'Comum' ? 80 : 40, fullMark: 100 },
  ];

  // Relationship chart (pink)
  const relationshipData = [
    { subject: 'Fogo', A: (contact?.libidoIndex || 5) * 10, fullMark: 100 },
    { subject: 'Materialismo', A: (contact?.financialExpectationIndex || 5) * 10, fullMark: 100 },
    { subject: 'Toxicidade', A: (contact?.jealousyIndex || 5) * 10, fullMark: 100 },
    { subject: 'Joguinho', A: (contact?.accessibilityIndex || 5) * 10, fullMark: 100 },
    { subject: 'Carência', A: (contact?.emotionalDependencyIndex || 5) * 10, fullMark: 100 },
  ];

  const hasAI = !!(
    (contact.summary && contact.summary.trim().length > 10) ||
    (contact.keyTraits && contact.keyTraits.length > 0) ||
    (contact.personalityType && contact.personalityType !== 'Desconhecida') ||
    (contact.behavioralAnalysis && contact.behavioralAnalysis.trim().length > 10)
  );

  if (!hasAI) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          <Users className="w-9 h-9 text-slate-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Dados insuficientes</h3>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          Este contato ainda não possui dados suficientes para gerar uma análise psicológica.
          Adicione prints do perfil ou áudios para a IA construir o perfil completo.
        </p>
        <button
          onClick={onAddPrintClick}
          className="bg-pink-500/90 hover:bg-pink-500 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.25)]"
        >
          + Adicionar Print
        </button>
      </div>
    );
  }

  return (
    <>
            {/* Extracted Info */}
            {contact.extractedInfo && (

              <section>
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <FileText className="text-pink-500 w-5 h-5" /> Informações Extraídas
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                  {contact.extractedInfo.context && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Contexto da Imagem</p>
                      <p className="text-sm text-slate-200">{contact.extractedInfo.context}</p>
                    </div>
                  )}
                  {contact.extractedInfo.language && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Idioma Principal</p>
                      <p className="text-sm font-bold text-pink-400">{contact.extractedInfo.language}</p>
                    </div>
                  )}
                  {contact.extractedInfo.zodiacSign && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Signo</p>
                      <p className="text-sm text-slate-200">{contact.extractedInfo.zodiacSign}</p>
                    </div>
                  )}
                  {contact.extractedInfo.interests && contact.extractedInfo.interests.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Interesses</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {contact.extractedInfo.interests.map((interest, i) => (
                          <span key={i} className="bg-white/10 text-slate-300 px-2 py-1 rounded-md text-xs">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {contact.extractedInfo.phone && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Telefone Identificado</p>
                      <p className="text-sm text-slate-200">{contact.extractedInfo.phone}</p>
                    </div>
                  )}
                  {contact.extractedInfo.rawText && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Texto Bruto (OCR)</p>
                      <div className="bg-black/30 p-3 rounded-lg max-h-40 overflow-y-auto">
                        <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{contact.extractedInfo.rawText}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Análise Social */}
            <section>
              <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                <Activity className="text-pink-500 w-5 h-5" /> Análise Social
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Seguidores</p>
                  <p className="text-xl font-bold text-white">{((contact.followers || 0) / 1000).toFixed(1)}k</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Seguindo</p>
                  <p className="text-xl font-bold text-white">{contact.following || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fotos</p>
                  <p className="text-xl font-bold text-white">{contact.photoCount || 0}</p>
                </div>
                <div className="col-span-3 bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ratio (Seguidores/Seguindo)</p>
                    <p className="text-lg font-bold text-pink-500">
                      {contact.following && contact.following > 0 
                        ? ((contact.followers || 0) / contact.following).toFixed(1) 
                        : (contact.followers || 0).toFixed(1)}:1
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Popularidade</p>
                    <div className="flex items-center gap-1">
                      <div className={cn("h-2 w-6 rounded-full", contact.popularity === 'Alta' ? "bg-pink-500" : "bg-white/20")}></div>
                      <div className={cn("h-2 w-6 rounded-full", contact.popularity === 'Alta' || contact.popularity === 'Média' ? "bg-pink-500" : "bg-white/20")}></div>
                      <div className="h-2 w-6 rounded-full bg-pink-500"></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Perfil Psicológico (Dual Radar Charts) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-bold flex items-center gap-2">
                  <BrainCircuit className="text-pink-500 w-5 h-5" /> Perfil Psicológico
                </h3>
                <button
                  onClick={() => setIsEditingStats(s => !s)}
                  className={cn(
                    "text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                    isEditingStats ? "bg-pink-500 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
                  )}
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditingStats ? 'Fechar' : 'Editar'}
                </button>
              </div>

              {/* Dual Charts*/}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Comportamento – Green */}
                <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Comportamento</p>
                  <div className="w-full h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={behaviorData}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Comportamento" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Relacionamento – Pink */}
                <div className="bg-white/5 border border-pink-500/20 rounded-xl p-3 flex flex-col items-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-2">Relacionamento</p>
                  <div className="w-full h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={relationshipData}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Relacionamento" dataKey="A" stroke="#e91e8c" fill="#e91e8c" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Edit Panel */}
              {isEditingStats && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Ajustar Notas (1–10)</p>
                  {/* Behavior sliders */}
                  <p className="text-xs font-bold text-emerald-400">Comportamento</p>
                  {[
                    { label: 'Vaidade', key: 'vanityIndex', val: contact.vanityIndex || 5 },
                    { label: 'Abertura', key: 'opennessIndex', val: contact.opennessIndex || 5 },
                  ].map(({ label, key, val }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
                      <input
                        type="range" min={1} max={10} step={1} value={val}
                        onChange={e => updateIndex(key, Number(e.target.value))}
                        className="flex-1 accent-emerald-400"
                      />
                      <span className="text-xs font-bold text-emerald-400 w-4 text-right">{val}</span>
                    </div>
                  ))}
                  {/* Relationship sliders */}
                  <p className="text-xs font-bold text-pink-400 pt-2">Relacionamento</p>
                  {[
                    { label: 'Fogo', key: 'libidoIndex', val: contact.libidoIndex || 5 },
                    { label: 'Materialismo', key: 'financialExpectationIndex', val: contact.financialExpectationIndex || 5 },
                    { label: 'Toxicidade', key: 'jealousyIndex', val: contact.jealousyIndex || 5 },
                    { label: 'Joguinho', key: 'accessibilityIndex', val: contact.accessibilityIndex || 5 },
                    { label: 'Carência', key: 'emotionalDependencyIndex', val: contact.emotionalDependencyIndex || 5 },
                  ].map(({ label, key, val }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
                      <input
                        type="range" min={1} max={10} step={1} value={val}
                        onChange={e => updateIndex(key, Number(e.target.value))}
                        className="flex-1 accent-pink-500"
                      />
                      <span className="text-xs font-bold text-pink-400 w-4 text-right">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {Array.isArray(contact.keyTraits) && contact.keyTraits.map(trait => (
                  <span key={trait} className="bg-pink-500/20 text-pink-500 border border-pink-500/30 px-3 py-1 rounded-full text-xs font-bold">
                    {trait}
                  </span>
                ))}
              </div>
              {contact.summary && (
                <p className="text-sm text-slate-300 text-center mt-3 italic">
                  "{contact.summary}"
                </p>
              )}
            </section>

            {/* Dicas de Abordagem */}
            <section>
              <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="text-pink-500 w-5 h-5" /> Dicas de Abordagem
              </h3>
              <div className="space-y-3">
                {Array.isArray(contact.approachTips) && contact.approachTips.map((tip, i) => (
                  <div key={i} className="bg-gradient-to-r from-pink-500/10 to-transparent border-l-2 border-pink-500 p-4 rounded-r-xl">
                    <p className="text-sm text-slate-200">{tip}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Análise Comportamental Profunda */}
            {contact.behavioralAnalysis && (
              <section>
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <BrainCircuit className="text-pink-500 w-5 h-5" /> Análise Comportamental
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {contact.behavioralAnalysis}
                  </p>
                </div>
              </section>
            )}

            {/* Abertura Sexual */}
            {contact.sexualOpenness && (
              <section>
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <Heart className="text-pink-500 w-5 h-5" /> Abertura Sexual & Intenções
                </h3>
                <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-5">
                  <p className="text-sm text-pink-100 leading-relaxed whitespace-pre-wrap">
                    {contact.sexualOpenness}
                  </p>
                </div>
              </section>
            )}

            {/* Red Flags */}
            {Array.isArray(contact.redFlags) && contact.redFlags.length > 0 && (
              <section>
                <h3 className="text-red-400 text-lg font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Pontos de Atenção
                </h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <ul className="list-disc pl-4 space-y-2">
                    {contact.redFlags.map((flag, i) => (
                      <li key={i} className="text-sm text-red-200">{flag}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
    </>
  );
}
