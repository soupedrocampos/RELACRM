import { fetchInstagramProfile } from './apify';
import { getApifyKey } from '../config/apifyConfig';

export const fetchAvatarInBackground = async (
  contactId: string,
  username: string,
  platform: string,
  updateContact: (id: string, updatedData: any) => void
) => {
  if (platform !== 'Instagram' && platform !== 'instagram') return;
  if (!username || username === 'Desconhecido') return;

  const apifyKey = getApifyKey();
  if (!apifyKey) return;

  console.log(`[Background] Iniciando busca assíncrona da foto HD para @${username}...`);
  try {
    const apifyData = await fetchInstagramProfile(username, apifyKey);
    
    if (apifyData?.profilePicUrl) {
      console.log(`[Background] Foto HD encontrada para @${username}! Atualizando contato...`);
      updateContact(contactId, { avatar: apifyData.profilePicUrl });
    } else {
      console.log(`[Background] Nenhuma foto HD encontrada para @${username} no Apify.`);
    }
  } catch (err: any) {
    console.error(`[Background] Falha ao buscar foto HD para @${username}:`, err.message);
  }
};
