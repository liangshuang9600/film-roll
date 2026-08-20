import { Router } from 'express';
import { queryAll, queryOne, run, saveDB } from '../db.js';

const router = Router();

// List all rolls
router.get('/', async (req, res) => {
  const rolls = await queryAll(`
    SELECT r.*,
      (SELECT COUNT(*) FROM photos WHERE roll_id = r.id) as photo_count
    FROM rolls r
    ORDER BY r.shoot_date DESC, r.created_at DESC
  `);

  const rollsWithPreviews = [];
  for (const roll of rolls) {
    const previews = await queryAll(
      'SELECT id, filename FROM photos WHERE roll_id = ? ORDER BY sort_order LIMIT 6',
      [roll.id]
    );
    rollsWithPreviews.push({ ...roll, previews });
  }

  res.json(rollsWithPreviews);
});

// Get single roll with all photos
router.get('/:id', async (req, res) => {
  const roll = await queryOne('SELECT * FROM rolls WHERE id = ?', [Number(req.params.id)]);
  if (!roll) return res.status(404).json({ error: 'Roll not found' });

  const photos = await queryAll(
    'SELECT * FROM photos WHERE roll_id = ? ORDER BY sort_order',
    [roll.id]
  );

  res.json({ ...roll, photos });
});

// Create a new roll
router.post('/', async (req, res) => {
  const { roll_number, title, shoot_date, location, camera, film_stock, notes } = req.body;

  const id = await run(
    `INSERT INTO rolls (roll_number, title, shoot_date, location, camera, film_stock, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [roll_number, title || null, shoot_date || null, location || null, camera || null, film_stock || null, notes || null]
  );
  saveDB();

  const roll = await queryOne('SELECT * FROM rolls WHERE id = ?', [id]);
  res.status(201).json(roll);
});

// Update a roll
router.put('/:id', async (req, res) => {
  const { roll_number, title, shoot_date, location, camera, film_stock, notes } = req.body;

  await run(
    `UPDATE rolls SET roll_number=?, title=?, shoot_date=?, location=?, camera=?, film_stock=?, notes=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    [roll_number, title, shoot_date, location, camera, film_stock, notes, Number(req.params.id)]
  );
  saveDB();

  const roll = await queryOne('SELECT * FROM rolls WHERE id = ?', [Number(req.params.id)]);
  res.json(roll);
});

// Delete a roll
router.delete('/:id', async (req, res) => {
  await run('DELETE FROM photos WHERE roll_id = ?', [Number(req.params.id)]);
  await run('DELETE FROM shares WHERE roll_id = ?', [Number(req.params.id)]);
  await run('DELETE FROM rolls WHERE id = ?', [Number(req.params.id)]);
  saveDB();
  res.status(204).end();
});

export default router;
