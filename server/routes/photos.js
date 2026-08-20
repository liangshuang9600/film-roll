import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';
import { Jimp } from 'jimp';
import archiver from 'archiver';
import { queryAll, queryOne, run, saveDB } from '../db.js';
import { storage } from '../storage/index.js';

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Given an original filename, derive its thumbnail filename.
function thumbName(filename) {
  const ext = path.extname(filename);
  return `thumb_${filename.replace(ext, '.jpg')}`;
}

// Upload photos to a roll (batch)
router.post('/upload/:rollId', upload.array('photos', 50), async (req, res) => {
  try {
    const roll = await queryOne('SELECT * FROM rolls WHERE id = ?', [Number(req.params.rollId)]);
    if (!roll) return res.status(404).json({ error: 'Roll not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有收到任何文件' });
    }

    const currentMax = await queryOne(
      'SELECT MAX(sort_order) as max_order FROM photos WHERE roll_id = ?',
      [Number(req.params.rollId)]
    );
    let sortOrder = (currentMax?.max_order || 0) + 1;

    const photos = [];
    const failed = [];

    for (const file of req.files) {
      try {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const filename = `${nanoid(12)}${ext}`;
        const thumbFilename = thumbName(filename);

        // Save original
        await storage.save(filename, file.buffer);

        // Generate thumbnail with Jimp
        let width = 0, height = 0;
        try {
          const image = await Jimp.read(file.buffer);
          width = image.width;
          height = image.height;

          // Resize for thumbnail
          const thumb = image.clone().resize({ w: 400 });
          const thumbBuffer = await thumb.getBuffer('image/jpeg', { quality: 80 });
          await storage.save(thumbFilename, thumbBuffer);
        } catch (e) {
          // If Jimp can't process (e.g. HEIC / TIFF), just save original as thumb
          console.error(`[upload] thumbnail failed for ${file.originalname}:`, e.message);
          await storage.save(thumbFilename, file.buffer);
        }

        const id = await run(
          `INSERT INTO photos (roll_id, filename, original_name, sort_order, width, height)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [Number(req.params.rollId), filename, file.originalname, sortOrder++, width, height]
        );

        photos.push({
          id,
          filename,
          original_name: file.originalname,
          sort_order: sortOrder - 1,
          width,
          height
        });
      } catch (fileErr) {
        // One bad file should not abort the whole batch
        console.error(`[upload] failed to process ${file.originalname}:`, fileErr);
        failed.push({ name: file.originalname, reason: fileErr.message });
      }
    }

    saveDB();

    if (photos.length === 0) {
      return res.status(500).json({ error: '所有照片处理失败', failed });
    }

    res.status(201).json({ photos, failed });
  } catch (err) {
    console.error('[upload] fatal error:', err);
    res.status(500).json({ error: err.message || '上传失败' });
  }
});

// Serve photo file
router.get('/file/:filename', async (req, res) => {
  if (storage.isRemote) {
    return res.redirect(storage.getUrl(req.params.filename));
  }
  res.sendFile(storage.getPath(req.params.filename));
});

// Serve thumbnail
router.get('/thumb/:filename', async (req, res) => {
  const thumb = thumbName(req.params.filename);
  if (storage.isRemote) {
    try {
      await storage.get(thumb);
      return res.redirect(storage.getUrl(thumb));
    } catch (e) {
      // Fallback to original if no thumbnail exists remotely
      return res.redirect(storage.getUrl(req.params.filename));
    }
  }
  res.sendFile(storage.getPath(thumb), (err) => {
    if (err) {
      // Fallback to original if no thumbnail
      res.sendFile(storage.getPath(req.params.filename));
    }
  });
});

// Download single photo
router.get('/download/:id', async (req, res) => {
  const photo = await queryOne('SELECT * FROM photos WHERE id = ?', [Number(req.params.id)]);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const downloadName = photo.original_name || photo.filename;

  if (storage.isRemote) {
    const buffer = await storage.get(photo.filename);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
    return res.end(buffer);
  }

  res.download(storage.getPath(photo.filename), downloadName);
});

// Download entire roll as ZIP
router.get('/download-roll/:rollId', async (req, res) => {
  const roll = await queryOne('SELECT * FROM rolls WHERE id = ?', [Number(req.params.rollId)]);
  if (!roll) return res.status(404).json({ error: 'Roll not found' });

  const photos = await queryAll(
    'SELECT * FROM photos WHERE roll_id = ? ORDER BY sort_order',
    [Number(req.params.rollId)]
  );

  const zipName = `${roll.roll_number || 'roll'}_${roll.id}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);

  for (const photo of photos) {
    const name = photo.original_name || photo.filename;
    if (storage.isRemote) {
      const buffer = await storage.get(photo.filename);
      archive.append(buffer, { name });
    } else {
      archive.file(storage.getPath(photo.filename), { name });
    }
  }

  await archive.finalize();
});

// Reorder photos
router.put('/reorder/:rollId', async (req, res) => {
  const { order } = req.body;
  for (let index = 0; index < order.length; index++) {
    await run('UPDATE photos SET sort_order = ? WHERE id = ? AND roll_id = ?',
      [index + 1, order[index], Number(req.params.rollId)]);
  }
  saveDB();
  res.json({ success: true });
});

// Delete a photo
router.delete('/:id', async (req, res) => {
  const photo = await queryOne('SELECT * FROM photos WHERE id = ?', [Number(req.params.id)]);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  await storage.remove(photo.filename);
  await storage.remove(thumbName(photo.filename));
  await run('DELETE FROM photos WHERE id = ?', [Number(req.params.id)]);
  saveDB();

  res.status(204).end();
});

// Convert Multer / router errors into JSON so the client can show a real reason
// (e.g. a file exceeding the 50MB limit is rejected before the route runs).
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('[upload] multer error:', err.code, err.message);
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? '有照片超过 50MB 上限'
      : `上传错误：${err.code}`;
    return res.status(400).json({ error: msg });
  }
  if (err) {
    console.error('[upload] router error:', err);
    return res.status(500).json({ error: err.message || '上传失败' });
  }
  next();
});

export default router;
