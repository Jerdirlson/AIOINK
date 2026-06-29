// Backend MVP de IAOINK — HTTP nativo (node:http), sin dependencias.
// Fuente principal de ingesta: el Atajo "Transacción" de Apple Wallet hace POST a /api/ingest/shortcut.
import { createServer } from "node:http";
import { openDb, categoryIdBySlug } from "./db.mjs";
import { categorize, normalizeMerchantToken } from "./categorize.mjs";

const PORT = process.env.PORT || 8787;
// Token demo del usuario 1 (en producción: uno por usuario, generado en la app).
const DEMO_TOKEN = process.env.IAOINK_TOKEN || "demo-token-cambia-esto";
const DEMO_USER = 1;

const db = openDb(process.env.IAOINK_DB || "iaoink.db");

// ---- helpers ----------------------------------------------------------------
const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve(null); }
    });
  });

const authed = (req) => {
  const h = req.headers["authorization"] || "";
  return h === `Bearer ${DEMO_TOKEN}`;
};

// Busca una regla aprendida del usuario para un token de comercio.
function ruleLookup(userId) {
  const stmt = db.prepare(`
    SELECT c.slug AS slug FROM category_rules r
    JOIN categories c ON c.id = r.category_id
    WHERE r.user_id = ? AND r.match_value = ?`);
  return (token) => {
    const row = stmt.get(userId, token);
    return row ? row.slug : null;
  };
}

// Inserta una transacción ya categorizada. amount: negativo=gasto, positivo=ingreso.
function insertTx({ userId, amount, currency = "COP", date, merchant, description, type, isManual }) {
  const cat = categorize({ merchant, description, amount, type }, ruleLookup(userId));
  const categoryId = categoryIdBySlug(db, cat.slug);
  const info = db.prepare(`
    INSERT INTO transactions (user_id, amount, currency, date, merchant, description, category_id, type, is_manual)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(userId, amount, currency, date, merchant ?? null, description ?? null, categoryId,
         type ?? (amount > 0 ? "income" : "expense"), isManual ? 1 : 0);
  return { id: Number(info.lastInsertRowid), category: cat.slug, auto_categorized: cat.source !== "fallback" };
}

// ---- rutas ------------------------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // Salud (sin auth)
    if (req.method === "GET" && path === "/health") {
      return json(res, 200, { ok: true, service: "iaoink-backend", db: "sqlite" });
    }

    // Categorías (sin auth, son fijas)
    if (req.method === "GET" && path === "/api/categories") {
      const rows = db.prepare("SELECT slug, name_es, icon FROM categories ORDER BY id").all();
      return json(res, 200, rows);
    }

    // A partir de aquí se requiere token
    if (!authed(req)) return json(res, 401, { error: "no autorizado: falta Bearer token" });

    // INGESTA desde el Atajo de Apple Wallet
    if (req.method === "POST" && path === "/api/ingest/shortcut") {
      const b = await readBody(req);
      if (!b || typeof b.amount !== "number" || !b.merchant) {
        return json(res, 400, { error: "se requiere { merchant, amount(number) }" });
      }
      const out = insertTx({
        userId: DEMO_USER,
        amount: -Math.abs(b.amount),                 // un pago siempre es gasto
        currency: b.currency || "COP",
        date: b.occurred_at || new Date().toISOString(),
        merchant: b.merchant,
        description: b.card ? `Apple Pay · ${b.card}` : "Apple Pay",
        type: "expense",
        isManual: 0,
      });
      return json(res, 201, out);
    }

    // Registro MANUAL (efectivo, compras online, etc.)
    if (req.method === "POST" && path === "/api/transactions") {
      const b = await readBody(req);
      if (!b || typeof b.amount !== "number") return json(res, 400, { error: "se requiere { amount(number) }" });
      const out = insertTx({
        userId: DEMO_USER,
        amount: b.amount,
        currency: b.currency || "COP",
        date: b.date || new Date().toISOString(),
        merchant: b.merchant,
        description: b.description,
        type: b.type,
        isManual: 1,
      });
      return json(res, 201, out);
    }

    // Listar transacciones
    if (req.method === "GET" && path === "/api/transactions") {
      const rows = db.prepare(`
        SELECT t.id, t.amount, t.currency, t.date, t.merchant, t.description,
               c.slug AS category, c.icon, t.type, t.is_manual
        FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = ? ORDER BY t.date DESC, t.id DESC LIMIT 200`).all(DEMO_USER);
      return json(res, 200, rows);
    }

    // Recategorizar (y APRENDER una regla para ese comercio)
    const m = path.match(/^\/api\/transactions\/(\d+)$/);
    if (req.method === "PATCH" && m) {
      const b = await readBody(req);
      const newSlug = b?.category;
      const catId = newSlug && categoryIdBySlug(db, newSlug);
      if (!catId) return json(res, 400, { error: "category (slug) inválida" });
      const tx = db.prepare("SELECT merchant FROM transactions WHERE id = ? AND user_id = ?")
        .get(Number(m[1]), DEMO_USER);
      if (!tx) return json(res, 404, { error: "transacción no encontrada" });
      db.prepare("UPDATE transactions SET category_id = ? WHERE id = ?").run(catId, Number(m[1]));
      // Aprender: este comercio → esta categoría (para futuras transacciones)
      const token = normalizeMerchantToken(tx.merchant || "");
      if (token) {
        db.prepare(`INSERT INTO category_rules (user_id, match_value, category_id) VALUES (?, ?, ?)
                    ON CONFLICT(user_id, match_value) DO UPDATE SET category_id = excluded.category_id`)
          .run(DEMO_USER, token, catId);
      }
      return json(res, 200, { id: Number(m[1]), category: newSlug, learned_rule: token || null });
    }

    // Resumen / dashboard
    if (req.method === "GET" && path === "/api/summary") {
      const byCat = db.prepare(`
        SELECT c.slug AS category, c.icon, ROUND(SUM(t.amount), 2) AS total, COUNT(*) AS n
        FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = ? GROUP BY c.slug ORDER BY total ASC`).all(DEMO_USER);
      const totals = db.prepare(`
        SELECT
          ROUND(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 2) AS gastos,
          ROUND(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 2) AS ingresos
        FROM transactions WHERE user_id = ?`).get(DEMO_USER);
      return json(res, 200, { ...totals, por_categoria: byCat });
    }

    return json(res, 404, { error: "ruta no encontrada" });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`IAOINK backend escuchando en http://localhost:${PORT}`);
  console.log(`Token demo: ${DEMO_TOKEN}`);
});
