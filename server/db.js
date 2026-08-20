// Dual-mode database layer.
// - Local development (no DATABASE_URL): pure-WASM SQLite via sql.js, persisted to a file.
// - Production (DATABASE_URL set, e.g. Railway PostgreSQL): real PostgreSQL via `pg`.
//
// Routes use the same async helpers (queryAll / queryOne / run / saveDB) regardless of engine.
// SQL is written once with `?` placeholders and CURRENT_TIMESTAMP (both engines support it);
// this layer translates `?` -> `$1,$2,...` and appends `RETURNING id` to INSERTs for PostgreSQL.

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const USE_PG = !!process.env.DATABASE_URL;

// ---- shared schema (dialect-specific primary key syntax) ----
function schemaSQL(pk) {
  return [
    `CREATE TABLE IF NOT EXISTS rolls (
      id ${pk},
      roll_number TEXT NOT NULL,
      title TEXT,
      shoot_date TEXT,
      location TEXT,
      camera TEXT,
      film_stock TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS photos (
      id ${pk},
      roll_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      sort_order INTEGER DEFAULT 0,
      width INTEGER,
      height INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS shares (
      id ${pk},
      roll_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS captions (
      id ${pk},
      roll_id INTEGER NOT NULL,
      cover_photo_id INTEGER,
      title TEXT,
      body TEXT,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  ];
}

// =====================================================================
// PostgreSQL implementation
// =====================================================================
let pgPool = null;

async function initPG() {
  const { default: pg } = await import('pg');
  const { Pool } = pg;
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Railway / most managed PG require SSL; allow self-signed.
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });
  for (const sql of schemaSQL('SERIAL PRIMARY KEY')) {
    await pgPool.query(sql);
  }
}

// Convert `?` placeholders to `$1, $2, ...`
function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function pgQueryAll(sql, params) {
  const { rows } = await pgPool.query(toPgPlaceholders(sql), params);
  return rows;
}

async function pgQueryOne(sql, params) {
  const rows = await pgQueryAll(sql, params);
  return rows.length ? rows[0] : null;
}

async function pgRun(sql, params) {
  let text = toPgPlaceholders(sql);
  const isInsert = /^\s*insert\s/i.test(text);
  if (isInsert && !/returning/i.test(text)) {
    text += ' RETURNING id';
  }
  const result = await pgPool.query(text, params);
  if (isInsert && result.rows.length) {
    return result.rows[0].id;
  }
  return null;
}

// =====================================================================
// SQLite (sql.js) implementation
// =====================================================================
let sqliteDb = null;
let sqliteFs = null;
const DB_PATH = path.join(__dirname, 'filmroll.db');

async function initSQLite() {
  const { default: initSqlJs } = await import('sql.js');
  sqliteFs = (await import('fs')).default;
  const SQL = await initSqlJs();

  if (sqliteFs.existsSync(DB_PATH)) {
    const buffer = sqliteFs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(buffer);
  } else {
    sqliteDb = new SQL.Database();
  }

  for (const sql of schemaSQL('INTEGER PRIMARY KEY AUTOINCREMENT')) {
    sqliteDb.run(sql);
  }
}

function sqliteQueryAll(sql, params) {
  const stmt = sqliteDb.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function sqliteQueryOne(sql, params) {
  const stmt = sqliteDb.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) result = stmt.getAsObject();
  stmt.free();
  return result;
}

function sqliteRun(sql, params) {
  sqliteDb.run(sql, params);
  const result = sqliteDb.exec('SELECT last_insert_rowid() as id');
  return result.length > 0 ? result[0].values[0][0] : null;
}

function sqliteSave() {
  if (sqliteDb && sqliteFs) {
    const data = sqliteDb.export();
    sqliteFs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// =====================================================================
// Public API (engine-agnostic, all async)
// =====================================================================
export async function initDB() {
  if (USE_PG) {
    await initPG();
    console.log('🗄️  Database: PostgreSQL (persistent)');
  } else {
    await initSQLite();
    console.log('🗄️  Database: SQLite file (local dev)');
  }
}

export async function queryAll(sql, params = []) {
  return USE_PG ? pgQueryAll(sql, params) : sqliteQueryAll(sql, params);
}

export async function queryOne(sql, params = []) {
  return USE_PG ? pgQueryOne(sql, params) : sqliteQueryOne(sql, params);
}

export async function run(sql, params = []) {
  return USE_PG ? pgRun(sql, params) : sqliteRun(sql, params);
}

// No-op in PostgreSQL mode (writes are committed immediately);
// persists the in-memory SQLite database to disk in local mode.
export function saveDB() {
  if (!USE_PG) sqliteSave();
}
