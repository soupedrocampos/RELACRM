// Este arquivo gerencia o endereço do servidor para o APK conseguir se conectar
const getServerIP = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;

  // Fallback padrão: Se estiver no navegador PC, usa vazio (localhost)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '';
  }
  
  // IP padrão para o APK se nada for configurado no .env
  return 'http://192.168.0.59:3000'; 
};

export const API_BASE_URL = getServerIP();
