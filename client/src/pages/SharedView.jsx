import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import FilmStrip from '../components/FilmStrip';
import LightBox from '../components/LightBox';

export default function SharedView() {
  const { token } = useParams();
  const [roll, setRoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightBoxIndex, setLightBoxIndex] = useState(-1);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await fetch(`/api/share/view/${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Not found');
        }
        const data = await res.json();
        setRoll(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchShared();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-film-amber/40 border-t-film-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-50">🎞️</div>
          <h2 className="text-xl text-gray-300 font-mono mb-2">
            {error === 'Share link has expired' ? 'Link Expired' : 'Not Found'}
          </h2>
          <p className="text-gray-500 text-sm">
            {error === 'Share link has expired' 
              ? 'This share link is no longer valid.'
              : 'This share link doesn\'t exist.'}
          </p>
        </div>
      </div>
    );
  }

  const handlePhotoClick = (photo, index) => {
    setLightBoxIndex(index);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Roll info */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-film-amber/10 border border-film-amber/20 rounded-full mb-4">
          <span className="text-xs text-film-amber font-mono">SHARED ROLL</span>
        </div>
        <h2 className="text-2xl font-mono text-gray-200">
          Roll #{roll.roll_number}
          {roll.title && <span className="text-gray-400 ml-3">{roll.title}</span>}
        </h2>
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500">
          {roll.shoot_date && <span className="font-mono">{roll.shoot_date}</span>}
          {roll.location && <span>{roll.location}</span>}
          {roll.film_stock && <span className="text-film-amber/50">{roll.film_stock}</span>}
        </div>
      </div>

      {/* Film strip */}
      {roll.photos && roll.photos.length > 0 && (
        <FilmStrip
          photos={roll.photos}
          size="large"
          onPhotoClick={handlePhotoClick}
        />
      )}

      {/* Photo count */}
      <div className="text-center mt-6">
        <span className="text-xs text-gray-600 font-mono">{roll.photos?.length || 0} frames</span>
      </div>

      {/* LightBox */}
      {lightBoxIndex >= 0 && roll.photos && (
        <LightBox
          photo={roll.photos[lightBoxIndex]}
          photos={roll.photos}
          currentIndex={lightBoxIndex}
          onClose={() => setLightBoxIndex(-1)}
          onNavigate={setLightBoxIndex}
        />
      )}
    </div>
  );
}
