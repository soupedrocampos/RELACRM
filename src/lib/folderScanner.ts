// src/lib/folderScanner.ts
import { Filesystem, Directory } from '@capacitor/filesystem';
import { extractTextLocally } from './ocr';

export interface ScannedImage {
  name: string;
  path: string;
  base64: string;
  extractedText: string;
}

/**
 * Lê todos os prints de uma pasta e extrai texto via OCR (Tesseract)
 * @param folderPath - ex: 'DCIM/Screenshots' ou 'Pictures/Screenshots'
 * @param onProgress - callback de progresso (0-100)
 */
export async function scanFolderForImages(
  folderPath: string = 'DCIM/Screenshots',
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<ScannedImage[]> {
  const results: ScannedImage[] = [];

  try {
    // Pedir permissão (Android 13+)
    await Filesystem.requestPermissions();

    const { files } = await Filesystem.readdir({
      path: folderPath,
      directory: Directory.ExternalStorage,
    });

    const imageFiles = files.filter(f =>
      /\.(jpg|jpeg|png|webp)$/i.test(f.name)
    );

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      onProgress?.(i + 1, imageFiles.length, file.name);

      try {
        const { data: base64 } = await Filesystem.readFile({
          path: `${folderPath}/${file.name}`,
          directory: Directory.ExternalStorage,
        });

        const dataUri = `data:image/jpeg;base64,${base64}`;
        const text = await extractTextLocally(dataUri);

        results.push({
          name: file.name,
          path: `${folderPath}/${file.name}`,
          base64: dataUri,
          extractedText: text,
        });
      } catch (e) {
        console.warn(`Erro ao processar ${file.name}:`, e);
      }
    }
  } catch (e) {
    console.error('Erro ao escanear pasta:', e);
    throw e;
  }

  return results;
}
