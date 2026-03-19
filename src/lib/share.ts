// src/lib/share.ts
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export async function shareText(title: string, text: string, url?: string) {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title, text, url, dialogTitle: 'Compartilhar via' });
  } else {
    // Fallback para web
    if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copiado para a área de transferência!');
    }
  }
}

export async function shareFile(filePath: string, title: string) {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title,
      url: filePath, // URI do arquivo local (capacitor://)
      dialogTitle: 'Compartilhar arquivo',
    });
  }
}
