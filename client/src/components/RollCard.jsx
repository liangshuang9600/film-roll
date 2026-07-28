import { useState } from 'react';
import FilmStrip from './FilmStrip';

export default function RollCard({ roll, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group cursor-pointer transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(roll)}
    >
      {/* Roll info header */}
      <div className="flex items-baseline justify-between mb-3 px-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-film-amber text-sm font-medium">
            #{roll.roll_number}
          </span>
          {roll.title && (
            <span className="text-gray-300 text-sm">{roll.title}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {roll.location && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {roll.location}
            </span>
          )}
          {roll.shoot_date && (
            <span className="font-mono">{roll.shoot_date}</span>
          )}
          <span className="text-film-border">{roll.photo_count} frames</span>
        </div>
      </div>

      {/* Mini film strip preview */}
      {roll.previews && roll.previews.length > 0 ? (
        <div className={`transform transition-transform duration-300 ${hovered ? 'scale-[1.01]' : ''}`}>
          <FilmStrip photos={roll.previews} size="small" />
        </div>
      ) : (
        <div className="bg-film-dark border border-film-border/30 rounded-lg py-8 text-center">
          <p className="text-gray-500 text-sm font-mono">Empty roll — no photos yet</p>
        </div>
      )}
    </div>
  );
}
