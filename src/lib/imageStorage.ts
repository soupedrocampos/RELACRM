import { get, set, del } from 'idb-keyval';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useState, useEffect } from 'react';

const IDB_IMAGE_PREFIX = 'img_blob_';

export async function saveImageBlob(id: string, blob: Blob): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const fileName = `${id}_${Date.now()}.jpg`;
      const base64Data = await blobToBase64(blob);
      
      await Filesystem.writeFile({
        path: `relacrm/prints/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });
      
      return `capacitor://relacrm/prints/${fileName}`;
    } catch (e) {
      console.error('Error saving via Capacitor Filesystem, falling back to IDB', e);
      // Fallback
    }
  }
  
  // Web / Fallback
  const key = `${IDB_IMAGE_PREFIX}${id}_${Date.now()}`;
  await set(key, blob);
  return key;
}

export async function saveBase64Image(id: string, base64: string): Promise<string> {
  if (!base64) return '';
  const blob = base64ToBlob(base64);
  return saveImageBlob(id, blob);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export async function getImageUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http')) return path;

  if (Capacitor.isNativePlatform() && path.startsWith('capacitor://')) {
    const relativePath = path.replace('capacitor://', '');
    try {
      const res = await Filesystem.readFile({
        path: relativePath,
        directory: Directory.Documents,
      });
      return `data:image/jpeg;base64,${res.data}`;
    } catch(e) {
      console.error('Error reading via Capacitor Filesystem', e);
      return null;
    }
  } else if (path.startsWith(IDB_IMAGE_PREFIX)) {
    const blob = await get<Blob>(path);
    if (blob) {
      return URL.createObjectURL(blob); // Temporary URL, caller should revoke, or use hook
    }
  }
  return path;
}

export async function getImageBase64(path: string): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('data:')) return path; // Already data url
  if (path.startsWith('blob:') || path.startsWith('http')) return null; // Hard to resolve sync without fetch

  if (Capacitor.isNativePlatform() && path.startsWith('capacitor://')) {
    const relativePath = path.replace('capacitor://', '');
    try {
      const res = await Filesystem.readFile({
        path: relativePath,
        directory: Directory.Documents,
      });
      return `data:image/jpeg;base64,${res.data}`;
    } catch(e) {
      return null;
    }
  } else if (path.startsWith(IDB_IMAGE_PREFIX)) {
    const blob = await get<Blob>(path);
    if (blob) {
      const base64 = await blobToBase64(blob);
      return `data:image/jpeg;base64,${base64}`;
    }
  }
  return null;
}

export async function deleteImage(path: string): Promise<void> {
  if (!path) return;
  if (Capacitor.isNativePlatform() && path.startsWith('capacitor://')) {
    const relativePath = path.replace('capacitor://', '');
    try {
        await Filesystem.deleteFile({
          path: relativePath,
          directory: Directory.Documents
        });
    } catch (e) {
        console.error('Error deleting via Capacitor', e);
    }
  } else if (path.startsWith(IDB_IMAGE_PREFIX)) {
    await del(path);
  }
}

export function base64ToBlob(base64: string, contentType = 'image/jpeg'): Blob {
  const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(pureBase64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

// React Hook for rendering
export function useImageUrl(path?: string) {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isActive = true;

    async function load() {
      if (!path) {
        setUrl(undefined);
        return;
      }
      
      if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http')) {
        setUrl(path);
        return;
      }

      const resolved = await getImageUrl(path);
      if (isActive && resolved) {
        setUrl(resolved);
        if (resolved.startsWith('blob:')) {
            objectUrl = resolved;
        }
      }
    }
    load();

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path]);

  return url;
}
