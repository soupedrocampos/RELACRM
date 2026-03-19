import Tesseract from 'tesseract.js';

export async function extractTextLocally(imageUri: string, onProgress?: (progress: number) => void): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageUri,
      'por+eng',
      {
        logger: m => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(m.progress);
          }
        }
      }
    );
    return text;
  } catch (error) {
    console.error('Local OCR Error:', error);
    return "";
  }
}
