import React, { useState } from 'react';
import { Heart, Plus, MapPin, Home, Bell, Settings, Camera, Images, Search } from 'lucide-react';
import { Screen } from '../App';
import { useContacts } from '../context/ContactsContext';
import { StoredImage } from '../components/ui/StoredImage';

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
}

const PREDEFINED_CITIES = [
  { name: 'Belo Horizonte', state: 'MG' },
  { name: 'Foz do Iguaçu', state: 'PR' },
  { name: 'Curitiba', state: 'PR' },
  { name: 'Balneário Camboriú', state: 'SC' },
  { name: 'Itapema', state: 'SC' },
  { name: 'Blumenau', state: 'SC' },
  { name: 'Porto Belo', state: 'SC' },
  { name: 'Penha', state: 'SC' },
  { name: 'Tijucas', state: 'SC' },
  { name: 'Florianópolis', state: 'SC' },
  { name: 'São Paulo', state: 'SP' },
  { name: 'Rio de Janeiro', state: 'RJ' },
];

function normalizeCity(name: string) {
  return name.split(',')[0].trim();
}

export function HomeScreen({ onNavigate }: Props) {
  const { contacts } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Initial Map with predefined cities
  const citiesMap: Record<string, { name: string; state: string; contactsCount: number; avatars: string[] }> = {};
  
  PREDEFINED_CITIES.forEach(c => {
    citiesMap[c.name] = { ...c, contactsCount: 0, avatars: [] };
  });

  // 2. Add contacts to map
  contacts.forEach(contact => {
    const rawCity = contact.city || 'Desconhecida';
    const parts = rawCity.split(',').map(p => p.trim());
    const cityName = parts[0];
    
    // Check if city exists in map (case-insensitive)
    const existingKey = Object.keys(citiesMap).find(k => k.toLowerCase() === cityName.toLowerCase());
    const finalKey = existingKey || cityName;

    if (!citiesMap[finalKey]) {
      const guessedState = parts.length > 1 && parts[1].length === 2 ? parts[1].toUpperCase() : 'Outros';
      citiesMap[finalKey] = {
        name: finalKey,
        state: guessedState,
        contactsCount: 0,
        avatars: [],
      };
    }

    citiesMap[finalKey].contactsCount += 1;
    if (citiesMap[finalKey].avatars.length < 4 && contact.avatar) {
      citiesMap[finalKey].avatars.push(contact.avatar);
    }
  });

  // 3. Group by State
  const stateGroups = Object.values(citiesMap).reduce((acc, city) => {
    if (!acc[city.state]) acc[city.state] = [];
    acc[city.state].push(city);
    return acc;
  }, {} as Record<string, typeof citiesMap[string][]>);

  // Sort states and cities within states
  const sortedStates = Object.keys(stateGroups).sort().filter(s => s !== 'Outros');
  if (stateGroups['Outros']) sortedStates.push('Outros');

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-[#0f0f0f]/60 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <Heart className="text-pink-500 fill-pink-500 w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight">RelaCRM</h1>
        </div>
        <button 
          onClick={() => onNavigate('bulk_import')}
          className="bg-pink-500 text-white p-2 rounded-md transition-all hover:bg-pink-600 flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 pt-4">
        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou cidade..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all"
          />
        </div>

        {searchQuery.trim().length > 0 ? (
          /* Render search results (Contacts) */
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Resultados da busca</h2>
            <div className="space-y-3 pb-24">
              {contacts.filter(c => 
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                c.city.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(contact => (
                <div 
                  key={contact.id}
                  onClick={() => onNavigate('contact_details', { contact })}
                  className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                  <StoredImage srcPath={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{contact.name}</p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {contact.city}
                    </p>
                  </div>
                </div>
              ))}
              {contacts.filter(c => 
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                c.city.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">Nenhum resultado encontrado.</div>
              )}
            </div>
          </div>
        ) : (
          /* Render normal Cities list grouped by State */
          <div className="space-y-8">
            {sortedStates.map(state => (
              <div key={state} className="space-y-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <span className="w-6 h-[1px] bg-white/10"></span>
                  {state}
                  <span className="flex-1 h-[1px] bg-white/10"></span>
                </h2>
                <div className="grid grid-cols-1 gap-4">
                   {stateGroups[state].sort((a,b) => a.name.localeCompare(b.name)).map((city) => (
                    <div 
                      key={city.name}
                      onClick={() => onNavigate('city_contacts', { city: city.name })}
                      className="bg-white/5 backdrop-blur-md border border-white/5 p-4 rounded-2xl cursor-pointer transition-transform active:scale-[0.98] hover:bg-white/10"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-base font-bold text-white">{city.name}</h3>
                          <p className="text-xs text-slate-400 font-medium">{city.contactsCount} contatos</p>
                        </div>
                        <div className="bg-pink-500/10 p-2 rounded-lg">
                          <MapPin className="text-pink-500 w-4 h-4" />
                        </div>
                      </div>
                      {city.avatars.length > 0 && (
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {city.avatars.map((avatar, i) => (
                              <StoredImage key={i} srcPath={avatar} alt="" className="w-8 h-8 rounded-full border border-[#0f0f0f] object-cover" />
                            ))}
                            {city.contactsCount > 4 && (
                              <div className="w-8 h-8 rounded-full border border-[#0f0f0f] bg-white/10 flex items-center justify-center text-[9px] font-bold text-slate-400">
                                +{city.contactsCount - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <div className="fixed bottom-28 right-6 flex flex-col items-end gap-3">
        <button 
          onClick={() => onNavigate('bulk_import')}
          className="group flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 pr-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          title="Importar Vários Prints"
        >
          <div className="bg-white/10 p-2 rounded-full">
            <Images className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold pr-1">Importar Vários</span>
        </button>
        <button 
          onClick={() => onNavigate('bulk_import')}
          className="group flex items-center gap-3 bg-pink-500 text-white p-3 pr-4 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-transform hover:scale-105 active:scale-95"
          title="Novo Print"
        >
          <div className="bg-white/20 p-2 rounded-full">
            <Camera className="w-5 h-5 fill-white" />
          </div>
          <span className="text-sm font-bold pr-1">Novo Print</span>
        </button>
      </div>

      <nav className="fixed bottom-0 w-full bg-[#0f0f0f]/80 backdrop-blur-xl border-t border-white/5 px-8 py-4 pb-8 flex justify-between items-center z-20">
        <button onClick={() => onNavigate('home')} className="flex flex-col items-center gap-1.5 text-pink-500">
          <Home className="w-6 h-6 fill-pink-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button onClick={() => onNavigate('reminders')} className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-pink-500 transition-colors">
          <Bell className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Lembretes</span>
        </button>
        <button onClick={() => onNavigate('settings')} className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-pink-500 transition-colors">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}
