// Capa de base de datos: SQLite integrado de Node (node:sqlite). Sin dependencias.
// Crea el esquema, lo migra de forma idempotente y siembra las categorías base.
import { DatabaseSync } from "node:sqlite";

// Categorías base (mapeadas a las ~15 de Belvo, en español + contexto Colombia).
export const SEED_CATEGORIES = [
  ["mercado", "Mercado", "🛒"],
  ["restaurantes", "Restaurantes", "🍔"],
  ["transporte", "Transporte", "🚗"],
  ["servicios", "Servicios públicos", "💡"],
  ["salud", "Salud", "🏥"],
  ["entretenimiento", "Entretenimiento", "🎬"],
  ["compras", "Compras", "🛍️"],
  ["viajes", "Viajes", "✈️"],
  ["educacion", "Educación", "📚"],
  ["hogar", "Hogar / Arriendo", "🏠"],
  ["suscripciones", "Suscripciones", "🔁"],
  ["ingresos", "Ingresos", "💰"],
  ["transferencias", "Transferencias", "🔄"],
  ["retiros", "Retiros / Cajero", "🏧"],
  ["sin-categoria", "Sin categoría", "❓"],
];

export function openDb(path = "iaoink.db") {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  seed(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY,
      apple_sub   TEXT UNIQUE,
      email       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id      INTEGER PRIMARY KEY,
      slug    TEXT UNIQUE NOT NULL,
      name_es TEXT NOT NULL,
      icon    TEXT,
      is_system INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id          INTEGER PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_value TEXT NOT NULL,                 -- token de comercio en minúsculas
      category_id INTEGER NOT NULL REFERENCES categories(id),
      UNIQUE(user_id, match_value)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      belvo_tx_id TEXT UNIQUE,                   -- null para registros manuales
      amount      REAL NOT NULL,                 -- positivo=ingreso, negativo=gasto
      currency    TEXT NOT NULL DEFAULT 'COP',
      date        TEXT NOT NULL,
      merchant    TEXT,
      description TEXT,
      category_id INTEGER REFERENCES categories(id),
      type        TEXT NOT NULL DEFAULT 'expense', -- expense|income|transfer
      is_manual   INTEGER NOT NULL DEFAULT 1,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);

    CREATE TABLE IF NOT EXISTS budgets (
      id          INTEGER PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      period      TEXT NOT NULL,                 -- 'YYYY-MM'
      amount      REAL NOT NULL,
      UNIQUE(user_id, category_id, period)
    );
  `);
}

function seed(db) {
  const insertCat = db.prepare(
    "INSERT OR IGNORE INTO categories (slug, name_es, icon) VALUES (?, ?, ?)"
  );
  for (const [slug, name, icon] of SEED_CATEGORIES) insertCat.run(slug, name, icon);

  // Usuario demo único mientras no hay auth (Fase 1).
  db.prepare("INSERT OR IGNORE INTO users (id, email) VALUES (1, 'demo@iaoink.app')").run();
}

export function categoryIdBySlug(db, slug) {
  const row = db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug);
  return row ? row.id : null;
}
