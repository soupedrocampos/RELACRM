import React from 'react';
import { ArrowLeft, Phone, Heart, Camera, Mic, Users, MessageCircle, Map, User, MapPin, Bell } from 'lucide-react';
import { Screen } from '../App';
import { cn } from '../lib/utils';
import { useContacts } from '../context/ContactsContext';
import { StoredImage } from '../components/ui/StoredImage';

interface Props {
  city: string;
  onNavigate: (screen: Screen, params?: any) => void;
}

export function CityContactsScreen({ city, onNavigate }: Props) {
  const { contacts: allContacts } = useContacts();
  const contacts = allContacts.filter(c => c.city.includes(city) || city.includes(c.city.split(',')[0]));

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden pb-24">
      <header className="sticky top-0 z-20 flex items-center bg-[#0f0f0f]/80 backdrop-blur-md p-4 border-b border-white/5">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-xl font-bold tracking-tight">{city}</h1>
        </div>
        <div className="bg-pink-500/20 text-pink-500 border border-pink-500/30 px-3 py-1 rounded-full text-sm font-semibold">
          {contacts.length} contatos
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4">
          {contacts.map(contact => (
            <div 
              key={contact.id}
              onClick={() => onNavigate('contact_details', { contact })}
              className="bg-gradient-to-b from-pink-500/15 to-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden relative flex flex-col shadow-2xl transition-all active:scale-[0.98] cursor-pointer hover:border-pink-500/30 group"
            >
              {contact.lastInteractionDays > 10 && (
                <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                  <span className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Bell className="w-3 h-3 fill-white" /> {contact.lastInteractionDays}d
                  </span>
                </div>
              )}
              <div className="p-3 flex justify-between items-start absolute w-full z-20">
                <span className="text-lg drop-shadow-sm">🇧🇷</span>
                <div className={cn(
                  "text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-lg",
                  contact.platform === 'Tinder' ? 'bg-orange-500' : 'bg-gradient-to-tr from-[#f09433] to-[#bc1888]'
                )}>
                  {contact.platform}
                </div>
              </div>
              <div className="flex flex-col items-center px-3 pt-8 pb-2 relative z-10">
                <div className="relative w-28 h-28 mb-4 mt-2">
                  <div className="absolute inset-0 bg-pink-500/30 rounded-full blur-xl group-hover:bg-pink-500/50 transition-colors"></div>
                  <div className="w-full h-full rounded-full border-2 border-pink-500 p-1 relative z-10 bg-[#0f0f0f]">
                    <StoredImage srcPath={contact.avatar} alt={contact.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                </div>
                <h3 className="font-black text-lg text-center text-white tracking-tight leading-tight mb-1 truncate w-full px-2">
                  {contact.platform.toLowerCase() === 'instagram' && !contact.name.startsWith('@') ? '@' : ''}{contact.name}
                </h3>
                <p className="text-pink-400 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center justify-center gap-1">
                  {contact.age} anos <span className="text-white/30">•</span> <MapPin className="w-3 h-3 inline" /> {contact.city.split(',')[0]}
                </p>
                <div className="flex gap-4 mb-2">
                  <Phone className={cn("w-5 h-5", contact.milestones.info?.whatsapp ? "text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" : "text-white/20")} />
                  <Heart className={cn("w-5 h-5", contact.milestones.phase?.kiss ? "text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" : "text-white/20")} />
                  <Camera className={cn("w-5 h-5", contact.milestones.info?.photo ? "text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" : "text-white/20")} />
                </div>
              </div>
              <div className="mt-auto p-2 flex justify-end">
                <button 
                  onClick={(e) => { e.stopPropagation(); onNavigate('record_audio', { contact }); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
                >
                  <Mic className="w-5 h-5 text-white/40" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <nav className="fixed bottom-0 w-full bg-[#0f0f0f]/90 backdrop-blur-xl border-t border-white/10 px-4 pb-8 pt-3 z-30">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <button onClick={() => onNavigate('home')} className="flex flex-col items-center gap-1 text-pink-500 group">
            <Users className="w-7 h-7 fill-pink-500 drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]" />
            <p className="text-[9px] font-black uppercase tracking-widest">Contatos</p>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-all group">
            <MessageCircle className="w-7 h-7" />
            <p className="text-[9px] font-black uppercase tracking-widest">Chats</p>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-all group">
            <Map className="w-7 h-7" />
            <p className="text-[9px] font-black uppercase tracking-widest">Mapa</p>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-all group">
            <User className="w-7 h-7" />
            <p className="text-[9px] font-black uppercase tracking-widest">Perfil</p>
          </button>
        </div>
      </nav>
    </div>
  );
}
