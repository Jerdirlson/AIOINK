// Prueba del núcleo SIN levantar servidor: ejercita DB + autocategorización + aprendizaje.
// Simula lo que enviaría el Atajo de Apple Wallet en cada compra.
import { openDb, categoryIdBySlug } from "./db.mjs";
import { categorize, normalizeMerchantToken } from "./categorize.mjs";

const db = openDb(":memory:");
const USER = 1;

const ruleLookup = (() => {
  const stmt = db.prepare(`
    SELECT c.slug AS slug FROM category_rules r
    JOIN categories c ON c.id = r.category_id
    WHERE r.user_id = ? AND r.match_value = ?`);
  return (token) => { const r = stmt.get(USER, token); return r ? r.slug : null; };
})();

function ingest(merchant, amount) {
  const cat = categorize({ merchant, amount: -Math.abs(amount), type: "expense" }, ruleLookup);
  const catId = categoryIdBySlug(db, cat.slug);
  db.prepare(`INSERT INTO transactions (user_id, amount, currency, date, merchant, category_id, type, is_manual)
              VALUES (?, ?, 'COP', datetime('now'), ?, ?, 'expense', 0)`)
    .run(USER, -Math.abs(amount), merchant, catId);
  return cat.slug;
}

// 1) Simular compras de Apple Pay (como las mandaría el Atajo)
const compras = [
  ["EXITO POBLADO", 53400],
  ["RAPPI COLOMBIA", 28900],
  ["UBER TRIP", 14200],
  ["NETFLIX.COM", 38900],
  ["CLARO COLOMBIA", 65000],
  ["DROGAS LA REBAJA", 21000],
  ["LA ESQUINA TIENDA", 9000],   // no reconocido → sin-categoria
];

console.log("== Autocategorización de compras simuladas (Apple Wallet) ==");
const results = compras.map(([m, a]) => [m, ingest(m, a)]);
for (const [m, slug] of results) console.log(`  ${m.padEnd(22)} → ${slug}`);

// 2) Aprendizaje: el usuario categoriza "LA ESQUINA TIENDA" como mercado
const token = normalizeMerchantToken("LA ESQUINA TIENDA");
db.prepare("INSERT INTO category_rules (user_id, match_value, category_id) VALUES (?, ?, ?)")
  .run(USER, token, categoryIdBySlug(db, "mercado"));
const relearned = ingest("LA ESQUINA TIENDA", 12000);
console.log(`\n== Aprendizaje ==`);
console.log(`  Tras corregir, "LA ESQUINA TIENDA" → ${relearned} (esperado: mercado)`);

// 3) Resumen
const totals = db.prepare(`
  SELECT ROUND(SUM(CASE WHEN amount<0 THEN amount END),0) AS gastos FROM transactions WHERE user_id=?`)
  .get(USER);
console.log(`\n== Resumen ==`);
console.log(`  Total gastos: ${totals.gastos} COP en ${compras.length + 1} transacciones`);

// Aserciones mínimas
const expect = { "EXITO POBLADO": "mercado", "RAPPI COLOMBIA": "restaurantes", "UBER TRIP": "transporte",
  "NETFLIX.COM": "suscripciones", "CLARO COLOMBIA": "servicios", "DROGAS LA REBAJA": "salud" };
let ok = true;
for (const [m, slug] of results) if (expect[m] && expect[m] !== slug) { ok = false; console.error(`  ✗ ${m}: ${slug} != ${expect[m]}`); }
if (relearned !== "mercado") { ok = false; console.error("  ✗ aprendizaje falló"); }
console.log(`\n${ok ? "✅ TODO OK" : "❌ HAY FALLOS"}`);
process.exit(ok ? 0 : 1);
