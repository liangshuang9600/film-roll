// Storage abstraction layer.
// Automatically uses Aliyun OSS when OSS credentials are present in the
// environment (e.g. on Railway); otherwise falls back to local disk for
// zero-config local development.
import path from 'path';

const useOSS =
  process.env.OSS_ACCESS_KEY_ID &&
  process.env.OSS_ACCESS_KEY_SECRET &&
  process.env.OSS_BUCKET &&
  process.env.OSS_REGION;

let storage;
if (useOSS) {
  ({ storage } = await import('./oss.js'));
  console.log('🗂️  Storage: Aliyun OSS (persistent)');
} else {
  ({ storage } = await import('./local.js'));
  console.log('🗂️  Storage: local disk (local dev)');
}

// Derive a thumbnail filename from an original filename (mirrors photos.js).
function thumbName(filename) {
  const ext = path.extname(filename);
  return `thumb_${filename.replace(ext, '.jpg')}`;
}

// Attach direct (signed) OSS URLs to a photo so the browser can load image
// bytes straight from OSS instead of proxying through the (overseas) server.
// No-op for local storage — the client falls back to the /api/photos routes.
export function withUrls(photo) {
  if (!photo || !storage.isRemote) return photo;
  return {
    ...photo,
    url: storage.getUrl(photo.filename),
    thumb_url: storage.getUrl(thumbName(photo.filename)),
  };
}

export { storage };
