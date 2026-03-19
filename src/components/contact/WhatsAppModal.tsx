import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  initialPhone: string;
  onClose: () => void;
  onSave: (phone: string) => void;
}

export function WhatsAppModal({ isOpen, initialPhone, onClose, onSave }: WhatsAppModalProps) {
  const [tempPhone, setTempPhone] = useState(initialPhone);

  useEffect(() => {
    if (isOpen) {
      setTempPhone(initialPhone);
    }
  }, [isOpen, initialPhone]);

  if (!isOpen) return null;

  const handleImportFromContacts = async () => {
    try {
      if ('contacts' in navigator) {
        const contacts = await (navigator as any).contacts.select(['tel'], { multiple: false });
        if (contacts && contacts.length > 0 && contacts[0].tel?.length > 0) {
          setTempPhone(contacts[0].tel[0]);
        }
      }
    } catch (e) {
      console.log('Contact picker not available or denied:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-xl font-bold text-white mb-1">Adicionar WhatsApp</h3>
        <p className="text-slate-500 text-sm mb-5">Digite o número ou importe da agenda.</p>
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Número (com DDD)</label>
          <input
            type="tel"
            value={tempPhone}
            onChange={e => setTempPhone(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-all font-medium"
            placeholder="Ex: 47999999999"
            autoFocus
          />
        </div>
        <button
          onClick={handleImportFromContacts}
          className="w-full mb-4 py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Phone className="w-4 h-4" /> Importar da Agenda
        </button>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(tempPhone)}
            disabled={!tempPhone.trim()}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#128C7E] transition-colors shadow-[0_0_15px_rgba(37,211,102,0.3)] disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
