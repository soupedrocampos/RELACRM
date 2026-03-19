import React from 'react';
import { useImageUrl } from '../../lib/imageStorage';

interface StoredImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  srcPath: string;
}

export function StoredImage({ srcPath, ...props }: StoredImageProps) {
  const url = useImageUrl(srcPath);
  
  // Exibimos um placeholder simples caso esteja carregando do IDB/Capacitor
  if (!url) {
    return <div className={`bg-white/10 animate-pulse ${props.className || ''}`} />;
  }

  return <img src={url} {...props} />;
}
