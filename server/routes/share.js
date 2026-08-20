import { Router } from 'express';
import { nanoid } from 'nanoid';
import { queryAll, queryOne, run, saveDB } from '../db.js';

const router = Router();

// Create a share link for a roll
router.post('/:rollId', async (req, res) => {
  const roll = await queryOne('SELECT * FROM rolls WHERE id = ?', [Number(req.params.rollId)]);
  if (!roll) return res.status(404).json({ error: 'Roll not found' });

  const token = nanoid(21);
  const expiresAt = req.body.expires_days
    ? new Date(Date.now() + req.body.expires_days * 86400000).toISOString()
    : null;

  await run(
    `INSERT INTO shares (roll_id, token, expires_at) VALUES (?, ?, ?)`,
    [Number(req.params.rollId), token, expiresAt]
  );
  saveDB();

  res.status(201).json({ token, expires_at: expiresAt });
});

// Access shared roll by token
router.get('/view/:token', async (req, res) => {
  const share = await queryOne('SELECT * FROM shares WHERE token = ?', [req.params.token]);
  if (!share) return res.status(404).json({ error: 'Share link not found' });

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Share link has expired' });
  }

  const roll = await queryOne('SELECT * FROM rolls WHERE id = ?', [share.roll_id]);
  const photos = await queryAll(
    'SELECT id, filename, original_name, sort_order, width, height FROM photos WHERE roll_id = ? ORDER BY sort_order',
    [share.roll_id]
  );

  res.json({ ...roll, photos });
});

// List shares for a roll
router.get('/list/:rollId', async (req, res) => {
  const shares = await queryAll(
    'SELECT * FROM shares WHERE roll_id = ? ORDER BY created_at DESC',
    [Number(req.params.rollId)]
  );
  res.json(shares);
});

// Delete a share
router.delete('/:id', async (req, res) => {
  await run('DELETE FROM shares WHERE id = ?', [Number(req.params.id)]);
  saveDB();
  res.status(204).end();
});

export default router;
