import { useState } from 'react';

export default function CopyCard({ caption, photos, onSelectCover, onRegenerate, generating }) {
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const cover = photos.find((p) => p.id === caption.cover_photo_id) || photos[0];
  const tags = caption.tags || [];

  const fullText = `${caption.title}\n\n${caption.body}\n\n${tags.join(' ')}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-xs text-gray-500 tracking-wider">SOCIAL POST</span>
        <div className="flex-1 border-t border-film-border/30" />
        <button
          onClick={onRegenerate}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-film-amber
            transition-colors disabled:opacity-40"
        >
          <svg className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {generating ? '生成中…' : '重新生成'}
        </button>
      </div>

      {/* Xiaohongshu-style card */}
      <div className="mx-auto max-w-[420px] bg-[#141414] border border-film-border/50 rounded-2xl overflow-hidden shadow-xl shadow-black/40">
        {/* Cover */}
        <div className="relative aspect-[3/4] bg-film-darker">
          {cover && (
            <img
              src={`/api/photos/file/${cover.filename}`}
              alt="cover"
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
              bg-black/55 backdrop-blur-sm text-white/90 text-xs hover:bg-black/70 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            换封面
          </button>
        </div>

        {/* Cover picker */}
        {pickerOpen && (
          <div className="flex gap-2 overflow-x-auto p-3 bg-film-darker border-b border-film-border/40 film-strip-container">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelectCover(p.id); setPickerOpen(false); }}
                className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors
                  ${p.id === caption.cover_photo_id ? 'border-film-amber' : 'border-transparent hover:border-film-border'}`}
              >
                <img src={`/api/photos/thumb/${p.filename}`} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Text content */}
        <div className="p-5">
          <h3 className="text-[17px] font-medium text-gray-100 leading-snug tracking-wide">
            {caption.title}
          </h3>
          <p className="mt-3 text-[14px] text-gray-400 leading-relaxed whitespace-pre-line">
            {caption.body}
          </p>
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1">
              {tags.map((t, i) => (
                <span key={i} className="text-[13px] text-film-amber/80">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-film-border/40">
          <span className="font-mono text-[11px] text-gray-600">AI generated · 可编辑复制</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-film-amber/10 border border-film-amber/30
              text-film-amber text-xs hover:bg-film-amber/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? '已复制' : '复制文案'}
          </button>
        </div>
      </div>
    </div>
  );
}
