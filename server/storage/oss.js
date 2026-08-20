import OSS from 'ali-oss';

const client = new OSS({
  region: process.env.OSS_REGION,            // e.g. "oss-cn-hangzhou"
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
  secure: true,
});

// Optional key prefix inside the bucket, e.g. "film-roll/"
const PREFIX = process.env.OSS_PREFIX || 'film-roll/';
const key = (filename) => `${PREFIX}${filename}`;

export const storage = {
  isRemote: true,

  async save(filename, buffer) {
    await client.put(key(filename), buffer);
    return filename;
  },

  async get(filename) {
    const result = await client.get(key(filename));
    return result.content; // Buffer
  },

  // Cheap existence check (HEAD) — does NOT download the object body.
  async head(filename) {
    try {
      await client.head(key(filename));
      return true;
    } catch (e) {
      return false;
    }
  },

  async remove(filename) {
    await client.delete(key(filename)).catch(() => {});
  },

  // Signed URL valid for 2 hours; embedded directly in API responses so the
  // browser can load images straight from OSS.
  getUrl(filename) {
    return client.signatureUrl(key(filename), { expires: 7200 });
  },

  getPath() {
    // Not applicable for remote storage.
    return null;
  },
};
