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

// Upload photos to a roll (batch)
router.post('/upload/:rollId', upload.array('photos', 50), async (req, res) => {
  const roll = queryOne('SELECT * FROM rolls WHERE id = ?', [Number(req.params.rollId)]);
  if (!roll) return res.status(404).json({ error: 'Roll not found' });

  const currentMax = queryOne(
    'SELECT MAX(sort_order) as max_order FROM photos WHERE roll_id = ?',
    [Number(req.params.rollId)]
  );
  let sortOrder = (currentMax?.max_order || 0) + 1;

  const photos = [];

  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${nanoid(12)}${ext}`;
    const thumbFilename = `thumb_${filename.replace(ext, '.jpg')}`;

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
      // If Jimp can't process (e.g. TIFF), just save original as thumb
      await storage.save(thumbFilename, file.buffer);
    }

    const id = run(
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
  }

  saveDB();
  res.status(201).json(photos);
});

// Serve photo file
router.get('/file/:filename', (req, res) => {
  const filepath = storage.getPath(req.params.filename);
  res.sendFile(filepath);
});

// Serve thumbnail
router.get('/thumb/:filename', (req, res) => {
  const ext = path.extname(req.params.filename);
  const thumbName = `thumb_${req.params.filename.replace(ext, '.jpg')}`;
  const filepath = storage.getPath(thumbName);
  res.sendFile(filepath, (err) => {
    if (err) {
      // Fallback to original if no thumbnail
      res.sendFile(storage.getPath(req.params.filename));
    }
  });
});

// Download single photo
router.get('/download/:id', (req, res) => {
  const photo = queryOne('SELECT * FROM photos WHERE id = ?', [Number(req.params.id)]);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const filepath = storage.getPath(photo.filename);
  res.download(filepath, photo.original_name || photo.filename);
});

// Download entire roll as ZIP
router.get('/download-roll/:rollId', async (req, res) => {
  const roll = queryOne('SELECT * FROM rolls WHERE id = ?', [Number(req.params.rollId)]);
  if (!roll) return res.status(404).json({ error: 'Roll not found' });

  const photos = queryAll(
    'SELECT * FROM photos WHERE roll_id = ? ORDER BY sort_order',
    [Number(req.params.rollId)]
  );

  const zipName = `${roll.roll_number || 'roll'}_${roll.id}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);

  for (const photo of photos) {
    const filepath = storage.getPath(photo.filename);
    archive.file(filepath, { name: photo.original_name || photo.filename });
  }

  await archive.finalize();
});

// Reorder photos
router.put('/reorder/:rollId', (req, res) => {
  const { order } = req.body;
  order.forEach((id, index) => {
    run('UPDATE photos SET sort_order = ? WHERE id = ? AND roll_id = ?',
      [index + 1, id, Number(req.params.rollId)]);
  });
  saveDB();
  res.json({ success: true });
});

// Delete a photo
router.delete('/:id', async (req, res) => {
  const photo = queryOne('SELECT * FROM photos WHERE id = ?', [Number(req.params.id)]);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  await storage.remove(photo.filename);
  const ext = path.extname(photo.filename);
  await storage.remove(`thumb_${photo.filename.replace(ext, '.jpg')}`);
  run('DELETE FROM photos WHERE id = ?', [Number(req.params.id)]);
  saveDB();

  res.status(204).end();
});

export default router;
