import React, { useState, useEffect, useRef } from 'react';
import { X, MoreVertical, Mic } from 'lucide-react';
import { Screen } from '../App';
import { Contact } from '../types';
import { cn } from '../lib/utils';
import { analyzeAudioTranscription } from '../services/ai';
import { useContacts } from '../context/ContactsContext';

// Add TypeScript support for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Props {
  contact: Contact;
  onNavigate: (screen: Screen, params?: any) => void;
}

export function RecordAudioScreen({ contact: initialContact, onNavigate }: Props) {
  const { updateContact } = useContacts();
  const [contact, setContact] = useState<Contact>(initialContact);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  
  const [newFluxo, setNewFluxo] = useState('');
  
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'pt-BR';

      recognitionInstance.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(prev => prev + ' ' + currentTranscript);
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn("Speech Recognition API não suportada neste navegador.");
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (recognition) recognition.stop();
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      setSeconds(0);
      setRecordedAudioBase64('');
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => setRecordedAudioBase64(reader.result as string);
          // Stop stream tracks
          stream.getTracks().forEach(track => track.stop());
        };

        if (recognition) recognition.start();
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Erro ao acessar o microfone:", err);
        alert("Erro ao acessar o microfone.");
      }
    }
  };

  const handleProcess = async () => {
    if (isRecording) {
      if (recognition) recognition.stop();
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setIsProcessing(true);
    
    // Call AI (Grok/Groq) with current bio/fluxo and new transcript
    const result = await analyzeAudioTranscription(contact.bio, transcript);
    
    setIsProcessing(false);
    if (result.success && result.data) {
      setNewFluxo(result.data);
      setShowResult(true);
    } else {
      alert("Falha ao analisar a transcrição.");
      setShowResult(false);
    }
  };

  const handleSaveNote = () => {
    const { m, s } = formatTime(seconds);
    const newNote = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pt-BR'),
      duration: `${m}:${s}`,
      summary: transcript.slice(0, 100) + (transcript.length > 100 ? '...' : ''),
      audioBlob: recordedAudioBase64
    };
    
    const updated = { 
      ...contact, 
      bio: newFluxo,
      audioNotes: [newNote, ...(contact.audioNotes || [])] 
    };
    updateContact(contact.id, updated);
    onNavigate('contact_details', { contact: updated });
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return { m, s };
  };

  const { m, s } = formatTime(seconds);

  return (
    <div className="relative flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#0f0f0f] bg-[radial-gradient(circle_at_50%_-20%,rgba(236,72,153,0.15)_0%,transparent_50%)]">
      <header className="flex items-center bg-transparent p-4 justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => onNavigate('contact_details', { contact })} className="text-slate-100 flex size-12 shrink-0 items-center justify-start opacity-70 hover:opacity-100 transition-opacity">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">{contact.name}</h2>
        <div className="flex w-12 items-center justify-end">
          <button className="text-slate-100 opacity-70 hover:opacity-100 transition-opacity">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-6 gap-8">
        {!showResult ? (
          <>
            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="flex gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/5 backdrop-blur-xl border border-white/10">
                  <p className="text-pink-500 text-2xl font-bold tracking-tighter">{m}</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/5 backdrop-blur-xl border border-white/10">
                  <p className="text-pink-500 text-2xl font-bold tracking-tighter">{s}</p>
                </div>
              </div>
              <p className={cn("text-pink-500/70 text-sm font-medium", isRecording && "animate-pulse")}>
                {isRecording ? "Gravando..." : isProcessing ? "Processando com IA..." : "Pausado"}
              </p>
            </div>

            <div className="flex items-center justify-center h-24 gap-1.5 my-8">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 bg-pink-500 rounded-full transition-all duration-150",
                    isRecording ? "animate-[pulse-height_1.2s_ease-in-out_infinite]" : "h-2",
                    [0, 6, 7].includes(i) ? "opacity-40" : [1, 11].includes(i) ? "opacity-60" : "opacity-100"
                  )}
                  style={isRecording ? { animationDelay: `${(i % 5) * 0.1}s`, filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.6))' } : {}}
                ></div>
              ))}
            </div>

            <div className="flex flex-col items-center justify-center gap-8">
              <div className="relative">
                <button 
                  onClick={toggleRecording}
                  disabled={isProcessing}
                  className={cn(
                    "relative flex h-24 w-24 items-center justify-center rounded-full transition-all border border-white/20",
                    isRecording ? "bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)] animate-[neon-pulse_2s_infinite_ease-in-out]" : "bg-white/10"
                  )}
                >
                  <Mic className="text-white w-10 h-10" />
                </button>
              </div>
              <button 
                onClick={handleProcess}
                disabled={transcript.length === 0 || isProcessing}
                className={cn(
                  "w-full max-w-xs flex cursor-pointer items-center justify-center rounded-lg h-12 px-6 font-bold tracking-wide transition-all",
                  transcript.length > 0 && !isProcessing ? "bg-white/5 border border-white/10 text-pink-500 hover:bg-pink-500/10" : "opacity-50 cursor-not-allowed bg-white/5 text-slate-500"
                )}
              >
                {isRecording ? "Parar e Processar" : "Processar Áudio"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-6 mt-4 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transcrição</label>
              <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                <p className="text-sm leading-relaxed text-slate-300">
                  {transcript || "(Áudio vazio)"}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Novo Fluxo Gerado</label>
              <div className="rounded-lg bg-pink-500/10 border border-pink-500/20 p-4">
                <p className="text-sm whitespace-pre-line leading-relaxed text-slate-300">
                  {newFluxo}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleSaveNote}
                className="flex-1 flex items-center justify-center rounded-lg h-12 px-4 bg-pink-500 text-white font-bold shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:brightness-110 active:scale-95 transition-all"
              >
                Salvar nota
              </button>
              <button 
                onClick={() => onNavigate('contact_details', { contact })}
                className="flex-1 flex items-center justify-center rounded-lg h-12 px-4 bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10 transition-all"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
      </main>
      
      <style>{`
        @keyframes pulse-height {
          0%, 100% { height: 1.5rem; }
          50% { height: 3.5rem; }
        }
        @keyframes neon-pulse {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(236, 72, 153, 0.5); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(236, 72, 153, 0.8); }
          100% { transform: scale(1); box-shadow: 0 0 20px rgba(236, 72, 153, 0.5); }
        }
      `}</style>
    </div>
  );
}
