import { useState } from 'react';

export default function ShareDialog({ isOpen, onClose, rollId, rollNumber }) {
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const createShare = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/share/${rollId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_days: 30 }),
      });
      const { token } = await res.json();
      const link = `${window.location.origin}/s/${token}`;
      setShareLink(link);
    } catch (err) {
      alert('Failed to create share link');
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-film-dark border border-film-border rounded-xl w-full max-w-md">
        <div className="p-5 border-b border-film-border flex items-center justify-between">
          <h2 className="text-lg font-mono text-gray-200">Share Roll #{rollNumber}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!shareLink ? (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-4 text-sm">
                Generate a public link for this roll. Anyone with the link can view the photos.
              </p>
              <button
                onClick={createShare}
                disabled={loading}
                className="px-5 py-2.5 bg-film-amber text-black font-medium rounded-lg
                  hover:bg-film-amber/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Share Link'}
              </button>
              <p className="text-gray-600 text-xs mt-3">Link expires in 30 days</p>
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Share URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-film-darker border border-film-border rounded-lg px-3 py-2 
                    text-sm text-gray-300 font-mono focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-lg font-mono text-sm transition-all
                    ${copied 
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                      : 'bg-film-amber/20 text-film-amber hover:bg-film-amber/30 border border-film-amber/30'
                    }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
