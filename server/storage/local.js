import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure upload directory exists
await fs.mkdir(UPLOAD_DIR, { recursive: true });

export const storage = {
  // true = files live on a remote object store (serve via getUrl)
  isRemote: false,

  async save(filename, buffer) {
    const filepath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filepath, buffer);
    return filename;
  },

  async get(filename) {
    const filepath = path.join(UPLOAD_DIR, filename);
    return fs.readFile(filepath);
  },

  async remove(filename) {
    const filepath = path.join(UPLOAD_DIR, filename);
    await fs.unlink(filepath).catch(() => {});
  },

  // Local files have no public URL; serve them from disk instead.
  getUrl() {
    return null;
  },

  getPath(filename) {
    return path.join(UPLOAD_DIR, filename);
  },

  getUploadDir() {
    return UPLOAD_DIR;
  }
};
