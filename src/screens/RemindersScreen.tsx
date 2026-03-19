import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Bell, Bot, Lightbulb, Copy, RefreshCw, X, Home, Settings, Send, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { Screen } from '../App';
import { useContacts } from '../context/ContactsContext';
import { cn } from '../lib/utils';
import { chatWithAssistant, suggestMessage } from '../services/ai';

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function RemindersScreen({ onNavigate }: Props) {
  const { contacts: allContacts } = useContacts();
  const [activeTab, setActiveTab] = useState<'lembretes' | 'assistente'>('lembretes');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [suggestionText, setSuggestionText] = useState<string>('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    role: 'assistant',
    content: 'Olá! Sou seu assistente de networking. Pergunte-me sobre seus contatos, quem está mais quente, quem você deve abordar hoje, etc.'
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contacts = allContacts.filter(c => c.lastInteractionDays > 7).sort((a, b) => b.lastInteractionDays - a.lastInteractionDays);

  const handleSuggest = async (id: string) => {
    setSelectedContactId(id);
    setShowSuggestion(true);
    await generateSuggestion(id);
  };

  const generateSuggestion = async (id: string) => {
    const contact = allContacts.find(c => c.id === id);
    if (!contact) return;

    setIsGeneratingSuggestion(true);
    setSuggestionText('');

    try {
      const response = await suggestMessage(JSON.stringify(contact));

      if (response.success && response.suggestion) {
        setSuggestionText(response.suggestion);
      } else {
        setSuggestionText('Não foi possível gerar uma sugestão no momento.');
      }
    } catch (error) {
      setSuggestionText('Erro ao conectar com o assistente.');
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'assistente') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await chatWithAssistant(userMsg.content, JSON.stringify(allContacts));

      if (response.success && response.reply) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.reply
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.error || 'Desculpe, ocorreu um erro ao processar sua pergunta.'
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Falha na conexão com o assistente.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 w-full max-w-[100vw] overflow-x-hidden bg-[#0f0f0f]">
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('home')} className="text-slate-100 hover:text-pink-500 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Lembretes</h1>
        </div>
        <button className="relative p-2 text-pink-500 group">
          <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
        </button>
      </header>

      <nav className="flex border-b border-white/5 bg-[#0f0f0f]">
        <button 
          onClick={() => setActiveTab('lembretes')}
          className={cn("flex-1 py-4 text-center border-b-2 font-bold text-sm transition-colors", activeTab === 'lembretes' ? "border-pink-500 text-pink-500" : "border-transparent text-slate-500 hover:text-slate-300")}
        >
          Sem interação
        </button>
        <button 
          onClick={() => setActiveTab('assistente')}
          className={cn("flex-1 py-4 text-center border-b-2 font-bold text-sm transition-colors flex items-center justify-center gap-2", activeTab === 'assistente' ? "border-pink-500 text-pink-500" : "border-transparent text-slate-500 hover:text-slate-300")}
        >
          <Bot className="w-4 h-4" /> Assistente IA
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto relative">
        {activeTab === 'lembretes' ? (
          <div className="px-4 py-6 space-y-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Mais tempo sem contato</p>
            <div className="space-y-3">
              {contacts.map(contact => (
                <div 
                  key={contact.id}
                  className={cn(
                    "bg-white/5 backdrop-blur-md p-4 rounded-xl flex items-center gap-4 transition-all group",
                    selectedContactId === contact.id ? "border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.1)]" : "border border-white/5 hover:border-pink-500/40"
                  )}
                >
                  <div className="relative">
                    <img src={contact.avatar} alt={contact.name} className={cn("w-14 h-14 rounded-full object-cover ring-2 transition-all", selectedContactId === contact.id ? "ring-pink-500/40" : "ring-pink-500/20 group-hover:ring-pink-500/40")} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">{contact.name}</h3>
                    <p className="text-xs text-pink-500 font-medium mt-0.5">{contact.lastInteractionDays} dias sem falar</p>
                  </div>
                  {selectedContactId === contact.id ? (
                    <button onClick={() => handleSuggest(contact.id)} className="flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:brightness-110 transition-all">
                      <Lightbulb className="w-4 h-4" /> Sugerir
                    </button>
                  ) : (
                    <button onClick={() => handleSuggest(contact.id)} className="flex items-center gap-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-pink-500/20">
                      <Bot className="w-4 h-4" /> IA
                    </button>
                  )}
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  Nenhum lembrete pendente.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full absolute inset-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex max-w-[85%]", msg.role === 'user' ? "ml-auto justify-end" : "mr-auto justify-start")}>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-pink-500 text-white rounded-tr-sm" 
                      : "bg-white/10 text-slate-200 border border-white/5 rounded-tl-sm"
                  )}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/20 prose-pre:border prose-pre:border-white/10">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex max-w-[85%] mr-auto justify-start">
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/5 rounded-tl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                    <span className="text-xs text-slate-400">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-[#0f0f0f] border-t border-white/5">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="Pergunte sobre seus contatos..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!inputMessage.trim() || isTyping}
                  className="absolute right-1.5 top-1.5 bottom-1.5 w-9 h-9 bg-pink-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:bg-white/10 transition-colors"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {showSuggestion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f0f]/85 backdrop-blur-xl border border-pink-500/20 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center border border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                    <Bot className="text-pink-500 w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Sugestão de mensagem</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Baseado no Instagram</p>
                  </div>
                </div>
                <button onClick={() => setShowSuggestion(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 mb-8 relative min-h-[100px] flex items-center justify-center">
                <span className="absolute -top-3 -left-1 text-pink-500/40 text-4xl select-none font-serif">"</span>
                {isGeneratingSuggestion ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                ) : (
                  <p className="text-slate-200 leading-relaxed italic text-sm relative z-10 w-full">
                    "{suggestionText}"
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => navigator.clipboard.writeText(suggestionText)}
                  disabled={isGeneratingSuggestion || !suggestionText}
                  className="flex-1 py-4 bg-pink-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] disabled:opacity-50 disabled:shadow-none"
                >
                  <Copy className="w-5 h-5" /> Copiar
                </button>
                <button 
                  onClick={() => selectedContactId && generateSuggestion(selectedContactId)}
                  disabled={isGeneratingSuggestion}
                  className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <RefreshCw className="w-5 h-5" /> Outra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-[#0f0f0f]/80 backdrop-blur-xl border-t border-white/5 px-8 py-4 pb-8 flex justify-between items-center z-20">
        <button onClick={() => onNavigate('home')} className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-pink-500 transition-colors">
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-pink-500">
          <Bell className="w-6 h-6 fill-pink-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Lembretes</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-pink-500 transition-colors">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}
