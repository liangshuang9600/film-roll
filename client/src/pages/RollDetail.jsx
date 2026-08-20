import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FilmStrip from '../components/FilmStrip';
import UploadModal from '../components/UploadModal';
import LightBox from '../components/LightBox';
import ShareDialog from '../components/ShareDialog';
import CopyCard from '../components/CopyCard';

export default function RollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roll, setRoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [lightBoxIndex, setLightBoxIndex] = useState(-1);
  const [caption, setCaption] = useState(null);
  const [captionBusy, setCaptionBusy] = useState(false);
  const [captionError, setCaptionError] = useState('');

  const fetchRoll = async () => {
    try {
      const res = await fetch(`/api/rolls/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setRoll(data);
    } catch (err) {
      navigate('/');
    }
    setLoading(false);
  };

  useEffect(() => { fetchRoll(); }, [id]);

  useEffect(() => {
    fetch(`/api/ai/caption/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setCaption(data); })
      .catch(() => {});
  }, [id]);

  const generateCaption = async () => {
    setCaptionBusy(true);
    setCaptionError('');
    try {
      const res = await fetch(`/api/ai/caption/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setCaptionError(data.detail || data.error || '生成失败,请重试');
      } else {
        setCaption(data);
      }
    } catch (err) {
      setCaptionError('网络错误,请重试');
    }
    setCaptionBusy(false);
  };

  const selectCover = async (photoId) => {
    setCaption((prev) => (prev ? { ...prev, cover_photo_id: photoId } : prev));
    try {
      await fetch(`/api/ai/caption/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_photo_id: photoId }),
      });
    } catch {
      // Non-fatal: local state already updated
    }
  };

  const handlePhotoClick = (photo, index) => {
    setLightBoxIndex(index);
  };

  const handleUploadComplete = (newPhotos) => {
    setRoll(prev => ({ ...prev, photos: [...(prev.photos || []), ...newPhotos] }));
  };

  if (loading || !roll) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-film-amber/40 border-t-film-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Back button & Roll info */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-gray-300 text-sm font-mono flex items-center gap-1 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to rolls
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-mono text-film-amber">#{roll.roll_number}</h2>
              {roll.title && <span className="text-xl text-gray-300">{roll.title}</span>}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {roll.shoot_date && <span className="font-mono">{roll.shoot_date}</span>}
              {roll.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {roll.location}
                </span>
              )}
              {roll.camera && <span>{roll.camera}</span>}
              {roll.film_stock && <span className="text-film-amber/60">{roll.film_stock}</span>}
            </div>
            {roll.notes && <p className="text-gray-600 text-sm mt-2">{roll.notes}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={generateCaption}
              disabled={captionBusy}
              className="flex items-center gap-2 px-3 py-2 bg-film-amber/10 border border-film-amber/30
                text-film-amber rounded-lg hover:bg-film-amber/20 transition-colors text-sm font-mono disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${captionBusy ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {captionBusy ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                )}
              </svg>
              {captionBusy ? '生成中…' : caption ? '重新生成文案' : '生成文案'}
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-3 py-2 bg-film-amber/10 border border-film-amber/30 
                text-film-amber rounded-lg hover:bg-film-amber/20 transition-colors text-sm font-mono"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
            <a
              href={`/api/photos/download-roll/${roll.id}`}
              className="flex items-center gap-2 px-3 py-2 border border-film-border text-gray-400 
                rounded-lg hover:border-gray-500 hover:text-gray-300 transition-colors text-sm font-mono"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ZIP
            </a>
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-2 px-3 py-2 border border-film-border text-gray-400 
                rounded-lg hover:border-gray-500 hover:text-gray-300 transition-colors text-sm font-mono"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Film strip */}
      {roll.photos && roll.photos.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-xs text-gray-500 tracking-wider">
              {roll.photos.length} FRAMES
            </span>
            <div className="flex-1 border-t border-film-border/30" />
          </div>
          <FilmStrip
            photos={roll.photos}
            size="large"
            onPhotoClick={handlePhotoClick}
          />
        </div>
      ) : (
        <div className="mt-12 text-center py-16 border border-dashed border-film-border/40 rounded-xl">
          <p className="text-gray-500 font-mono mb-4">This roll is empty</p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-5 py-2.5 bg-film-amber text-black font-medium rounded-lg hover:bg-film-amber/90 transition-colors"
          >
            Upload Photos
          </button>
        </div>
      )}

      {/* AI social-post caption */}
      {captionError && (
        <div className="mt-8 mx-auto max-w-[420px] text-center text-sm text-red-400/80 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
          {captionError}
        </div>
      )}
      {caption && roll.photos && roll.photos.length > 0 && (
        <CopyCard
          caption={caption}
          photos={roll.photos}
          onSelectCover={selectCover}
          onRegenerate={generateCaption}
          generating={captionBusy}
        />
      )}

      {/* Modals */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleUploadComplete}
        rollId={roll.id}
      />

      <ShareDialog
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        rollId={roll.id}
        rollNumber={roll.roll_number}
      />

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
