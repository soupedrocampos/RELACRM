import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Contact } from '../types';
import { get, set } from 'idb-keyval';
import { saveBase64Image } from '../lib/imageStorage';

interface ContactsContextType {
  contacts: Contact[];
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updatedContact: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  isLoaded: boolean;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContactsState] = useState<Contact[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadContacts() {
      try {
        let saved = await get('relacrm_contacts_idb');
        if (saved) {
          let migratedAny = false;
          for (let i = 0; i < saved.length; i++) {
            const contact = saved[i];
            let contactMigrated = false;

            // 1. Ensure required structures exist (Standardization)
            if (!contact.milestones || typeof contact.milestones !== 'object') {
              contact.milestones = { 
                phase: { kiss: false, drink: false, skull: false }, 
                info: { whatsapp: false, map: false, photo: false } 
              };
              contactMigrated = true;
            } else {
              if (!contact.milestones.phase) { contact.milestones.phase = { kiss: false, drink: false, skull: false }; contactMigrated = true; }
              if (!contact.milestones.info) { contact.milestones.info = { whatsapp: false, map: false, photo: false }; contactMigrated = true; }
            }
            if (!Array.isArray(contact.prints)) { contact.prints = []; contactMigrated = true; }
            if (!Array.isArray(contact.audioNotes)) { contact.audioNotes = []; contactMigrated = true; }
            if (!Array.isArray(contact.keyTraits)) { contact.keyTraits = []; contactMigrated = true; }
            if (!Array.isArray(contact.approachTips)) { contact.approachTips = []; contactMigrated = true; }
            if (!Array.isArray(contact.redFlags)) { contact.redFlags = []; contactMigrated = true; }
            
            if (contact.lastInteractionDays === undefined) { contact.lastInteractionDays = 0; contactMigrated = true; }
            if (!contact.name) { contact.name = 'Desconhecido'; contactMigrated = true; }
            if (!contact.city) { contact.city = 'Desconhecida'; contactMigrated = true; }
            if (!contact.platform) { contact.platform = 'Instagram'; contactMigrated = true; }
            if (!contact.avatar) { contact.avatar = 'https://i.pravatar.cc/150'; contactMigrated = true; }

            // 2. Image migration (Data URI to local paths)
            let newPrints = [...contact.prints];
            for (let j = 0; j < newPrints.length; j++) {
              let print = newPrints[j];
              if (print && print.startsWith('data:') && print.length > 1000) {
                 const storagePath = await saveBase64Image(contact.id, print);
                 newPrints[j] = storagePath;
                 contactMigrated = true;
              }
            }
            
            if (contactMigrated) {
               saved[i] = { ...contact, prints: newPrints };
               migratedAny = true;
            }
          }
          if (migratedAny) {
            await set('relacrm_contacts_idb', saved);
          }
          setContactsState(saved);
        } else {
          // Migração retroativa (se o usuário possuir dados no limite do LocalStorage antigo)
          const localSaved = localStorage.getItem('relacrm_contacts');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            setContactsState(parsed);
            await set('relacrm_contacts_idb', parsed);
            localStorage.removeItem('relacrm_contacts'); // Libera espaço
          }
        }
      } catch (e) {
        console.error("Falha ao carregar IndexedDB:", e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadContacts();
  }, []);

  const saveToIDB = async (newContacts: Contact[]) => {
    setContactsState(newContacts);
    try {
      await set('relacrm_contacts_idb', newContacts);
    } catch (e) {
      console.error("Falha ao salvar no IndexedDB:", e);
    }
  };

  const addContact = (contact: Contact) => {
    saveToIDB([contact, ...contacts]);
  };

  const updateContact = (id: string, updatedContact: Partial<Contact>) => {
    saveToIDB(contacts.map(c => c.id === id ? { ...c, ...updatedContact } : c));
  };

  const deleteContact = (id: string) => {
    saveToIDB(contacts.filter(c => c.id !== id));
  };

  return (
    <ContactsContext.Provider value={{ contacts, addContact, updateContact, deleteContact, isLoaded }}>
      {isLoaded ? children : <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-pink-500 font-bold tracking-widest uppercase text-sm">Carregando Banco de Dados...</div>}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
}
