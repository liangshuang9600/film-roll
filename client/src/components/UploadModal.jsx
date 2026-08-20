import { useState, useCallback } from 'react';

export default function UploadModal({ isOpen, onClose, onUpload, rollId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));

    try {
      const res = await fetch(`/api/photos/upload/${rollId}`, {
        method: 'POST',
        body: formData,
      });

      // Always try to read the server's JSON (it carries the real error reason)
      let data = null;
      try { data = await res.json(); } catch (_) { /* non-JSON response */ }

      if (!res.ok) {
        const reason = data?.error || `服务器返回 ${res.status}`;
        throw new Error(reason);
      }

      // New response shape: { photos, failed }; keep backward-compat with plain array
      const photos = Array.isArray(data) ? data : (data?.photos || []);
      const failed = Array.isArray(data) ? [] : (data?.failed || []);

      setProgress(100);

      if (failed.length > 0) {
        alert(
          `成功上传 ${photos.length} 张，${failed.length} 张失败：\n` +
          failed.map(f => `· ${f.name}：${f.reason}`).join('\n')
        );
      }

      setTimeout(() => {
        setFiles([]);
        setUploading(false);
        setProgress(0);
        onUpload?.(photos);
        onClose();
      }, 500);
    } catch (err) {
      alert('上传失败：' + err.message);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-film-dark border border-film-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-film-border">
          <h2 className="text-lg font-mono text-gray-200">Upload Photos</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragOver ? 'border-film-amber bg-film-amber/5' : 'border-film-border hover:border-gray-500'}`}
          >
            <svg className="w-12 h-12 mx-auto text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 mb-2">拖拽照片到这里，或者</p>
            <label className="inline-block px-4 py-2 bg-film-amber/20 text-film-amber rounded-lg cursor-pointer hover:bg-film-amber/30 transition-colors font-mono text-sm">
              选择文件
              <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>
            <p className="text-gray-600 text-xs mt-2">支持 JPG / PNG / TIFF，单张最大 50MB</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-film-darker rounded px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-film-amber/60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-gray-300 truncate">{file.name}</span>
                    <span className="text-xs text-gray-600 flex-shrink-0">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-600 hover:text-red-400 transition-colors ml-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-film-border bg-film-darker/50">
          <span className="text-sm text-gray-500">
            {files.length > 0 ? `${files.length} files selected` : 'No files selected'}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="px-5 py-2 bg-film-amber text-black font-medium rounded-lg text-sm
                disabled:opacity-40 disabled:cursor-not-allowed hover:bg-film-amber/90 transition-colors"
            >
              {uploading ? `Uploading... ${progress}%` : `Upload ${files.length} photos`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
