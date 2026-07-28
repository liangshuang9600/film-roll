import { useRef } from 'react';
import FilmFrame from './FilmFrame';

export default function FilmStrip({ photos, size = 'normal', onPhotoClick }) {
  const scrollRef = useRef(null);

  const handleWheel = (e) => {
    if (scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="relative">
      {/* Film strip background */}
      <div className="bg-film-dark border-y border-film-border/40 py-3 px-4 rounded-lg">
        {/* Film edge markings */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] text-film-amber/40 tracking-widest">KODAK</span>
          <div className="flex-1 border-t border-dashed border-film-border/20" />
          <span className="font-mono text-[10px] text-film-amber/40">△ △ △</span>
        </div>

        {/* Scrollable film strip */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex gap-3 overflow-x-auto film-strip-container pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Leader */}
          <div className="flex-shrink-0 flex items-center px-2">
            <div className="font-mono text-[10px] text-film-border/50 writing-vertical rotate-180"
              style={{ writingMode: 'vertical-rl' }}>
              ◀ START
            </div>
          </div>

          {photos.map((photo, index) => (
            <FilmFrame
              key={photo.id}
              photo={photo}
              index={index}
              size={size}
              onClick={onPhotoClick}
            />
          ))}

          {/* Trailer */}
          <div className="flex-shrink-0 flex items-center px-2">
            <div className="font-mono text-[10px] text-film-border/50"
              style={{ writingMode: 'vertical-rl' }}>
              END ▶
            </div>
          </div>
        </div>

        {/* Film edge markings bottom */}
        <div className="flex items-center gap-2 mt-2">
          <span className="font-mono text-[10px] text-film-amber/40">5063</span>
          <div className="flex-1 border-t border-dashed border-film-border/20" />
          <span className="font-mono text-[10px] text-film-amber/40 tracking-widest">PORTRA 400</span>
        </div>
      </div>
    </div>
  );
}
