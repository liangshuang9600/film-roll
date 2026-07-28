import { useState } from 'react';

export default function FilmFrame({ photo, index, onClick, size = 'normal' }) {
  const [loaded, setLoaded] = useState(false);
  
  const sizeClasses = {
    small: 'w-24 h-16',
    normal: 'w-48 h-32',
    large: 'w-72 h-48',
  };

  const sprocketSize = size === 'small' ? 'w-2 h-2.5' : 'w-3 h-4';

  return (
    <div className="flex-shrink-0 flex flex-col items-center group">
      {/* Top sprocket holes */}
      <div className="flex gap-1 mb-1">
        {Array.from({ length: size === 'small' ? 3 : 5 }).map((_, i) => (
          <div key={`top-${i}`} className={`${sprocketSize} rounded-sm bg-film-darker border border-film-border/50`} />
        ))}
      </div>
      
      {/* Photo frame */}
      <div
        className={`${sizeClasses[size]} relative overflow-hidden rounded-sm border border-film-border/30 
          bg-film-dark cursor-pointer transition-all duration-300
          group-hover:border-film-amber/50 group-hover:shadow-lg group-hover:shadow-film-amber/10`}
        onClick={() => onClick?.(photo, index)}
      >
        {photo ? (
          <>
            <img
              src={`/api/photos/thumb/${photo.filename}`}
              alt={photo.original_name || `Frame ${index + 1}`}
              className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
            />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-film-amber/40 border-t-film-amber rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-film-border">
            <span className="font-mono text-xs">UNEXPOSED</span>
          </div>
        )}

        {/* Frame number overlay */}
        <div className="absolute bottom-1 right-1 font-mono text-[10px] text-film-amber/60 
          bg-black/50 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {String(index + 1).padStart(2, '0')}
        </div>
      </div>

      {/* Bottom sprocket holes */}
      <div className="flex gap-1 mt-1">
        {Array.from({ length: size === 'small' ? 3 : 5 }).map((_, i) => (
          <div key={`bot-${i}`} className={`${sprocketSize} rounded-sm bg-film-darker border border-film-border/50`} />
        ))}
      </div>
    </div>
  );
}
