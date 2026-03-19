import React, { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { CityContactsScreen } from './screens/CityContactsScreen';
import { ContactDetailsScreen } from './screens/ContactDetailsScreen';
import { RemindersScreen } from './screens/RemindersScreen';
import { RecordAudioScreen } from './screens/RecordAudioScreen';
import { BulkImportScreen } from './screens/BulkImportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DuplicateCheckScreen } from './screens/DuplicateCheckScreen';
import { Contact } from './types';
import { ContactsProvider } from './context/ContactsContext';

export type Screen = 'home' | 'city_contacts' | 'contact_details' | 'reminders' | 'record_audio' | 'bulk_import' | 'settings' | 'duplicate_check';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [fromScreen, setFromScreen] = useState<Screen | null>(null);

  const navigate = (screen: Screen, params?: { city?: string; contact?: Contact; from?: Screen }) => {
    if (params?.city) setSelectedCity(params.city);
    if (params?.contact) setSelectedContact(params.contact);
    if (params?.from) setFromScreen(params.from);
    else if (screen === 'home') setFromScreen(null); // Reset from when going home
    
    setCurrentScreen(screen);
  };

  return (
    <ContactsProvider>
      <div className="bg-[#0f0f0f] min-h-screen w-full max-w-[100vw] overflow-x-hidden text-slate-100 font-sans selection:bg-pink-500/30">
        {currentScreen === 'home' && <HomeScreen onNavigate={navigate} />}
        {currentScreen === 'city_contacts' && <CityContactsScreen city={selectedCity!} onNavigate={navigate} />}
        {currentScreen === 'contact_details' && <ContactDetailsScreen contact={selectedContact!} onNavigate={navigate} fromScreen={fromScreen || undefined} />}
        {currentScreen === 'reminders' && <RemindersScreen onNavigate={navigate} />}
        {currentScreen === 'record_audio' && <RecordAudioScreen contact={selectedContact!} onNavigate={navigate} />}
        {currentScreen === 'bulk_import' && <BulkImportScreen onNavigate={navigate} />}
        {currentScreen === 'settings' && <SettingsScreen onNavigate={navigate} />}
        {currentScreen === 'duplicate_check' && <DuplicateCheckScreen onNavigate={navigate} />}
      </div>
    </ContactsProvider>
  );
}

