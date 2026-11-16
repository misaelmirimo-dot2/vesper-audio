import React, { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface ArtworkImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  alt,
  className = 'w-12 h-12 rounded-lg',
}) => {
  const [failed, setFailed] = useState(false);
  const needsEdgeTrim = Boolean(src?.includes('cover_nocturne_synth'));

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#1C1C26] to-[#121218] border border-[#262632] text-violet-400/70 shrink-0 ${className}`}
        aria-label={alt}
      >
        <Disc3 className="w-1/2 h-1/2" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-[#15151B] shrink-0 ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover ${
          needsEdgeTrim ? 'scale-[1.18]' : ''
        }`}
        loading="lazy"
      />
    </div>
  );
};
