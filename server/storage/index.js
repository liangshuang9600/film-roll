// Storage abstraction layer.
// Automatically uses Aliyun OSS when OSS credentials are present in the
// environment (e.g. on Railway); otherwise falls back to local disk for
// zero-config local development.

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

export { storage };
