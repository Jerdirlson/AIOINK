// Motor de autocategorización por reglas (contexto Colombia).
// Estrategia: 1) regla aprendida del usuario  2) palabras clave de comercio  3) sin-categoría.
// Devuelve un slug de categoría (ver SEED_CATEGORIES en db.mjs).

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g"); // tildes tras normalizar NFD

// Mapa de palabras clave → slug. Se evalúa EN ORDEN; gana la primera coincidencia.
// Lo más específico va primero para evitar falsos positivos.
const KEYWORD_RULES = [
  ["suscripciones", ["netflix", "spotify", "disney", "hbo", " max", "prime video", "youtube premium",
    "apple.com", "icloud", "paramount", "crunchyroll", "deezer", "canva", "chatgpt", "openai",
    "notion", "dropbox", "google one", "microsoft 365", "office 365"]],
  ["servicios", ["claro", "movistar", "tigo", " wom", " etb", " epm", "codensa", "enel", "vanti",
    "acueducto", "directv", "gas natural", "une ", "energia", "telefonia"]],
  ["transporte", ["uber", "didi", "cabify", "indriver", "terpel", "primax", "biomax", "mobil",
    "esso", "texaco", "petrobras", "estacion de servicio", "parqueadero", "transmilenio",
    "metro de medellin", "peaje", "gasolina", "combustible", "wheels"]],
  ["salud", ["farmacia", "drogas", "cruz verde", "farmatodo", "locatel", "colsanitas", "sanitas",
    "compensar", "clinica", "hospital", "laboratorio", "dentista", " eps", "droguer"]],
  ["viajes", ["avianca", "latam", "wingo", "viva air", "despegar", "booking", "airbnb", "hotel",
    "hostal", "expedia", "trivago"]],
  ["restaurantes", ["rappi", "ifood", "mcdonald", "domino", " kfc", "burger", "frisby", "crepes",
    "juan valdez", "starbucks", "restaurante", "pizza", "subway", "presto", "el corral", "tostao",
    "sandwich", "wok", "sushi", "bar ", "cafe"]],
  ["mercado", ["exito", "carulla", " d1", " ara", "justo & bueno", "olimpica", "makro", "jumbo",
    "euro", "surtimax", "surtimayorista", "consumo", "dollarcity", "supermercado", "mercado",
    "minimercado", "fruver"]],
  ["hogar", ["homecenter", "constructor", "ferreteria", "arriendo", "administracion", "easy "]],
  ["compras", ["alkosto", "ktronix", "mercadolibre", "mercado libre", "amazon", "aliexpress",
    "shein", "temu", "zara", "adidas", "nike", "arturo calle", "falabella", "ropa", "almacen"]],
  ["entretenimiento", ["cinemark", "cine colombia", "cinecolombia", "royal films", "cine ", "teatro",
    "discoteca", "billar", "bowling", "concierto", "boleta"]],
  ["educacion", ["universidad", "colegio", "platzi", "udemy", "coursera", "libreria", "panamericana"]],
  ["transferencias", ["nequi", "daviplata", "transfiya", " pse", "ach ", "transferencia"]],
  ["retiros", ["cajero", " atm", "retiro", "servibanca", "aval "]],
];

const INCOME_HINTS = ["nomina", "salario", "pago de", "consignacion", "deposito", "abono",
  "devolucion", "reembolso"];

export function normalizeMerchantToken(merchant = "") {
  // Token estable para guardar reglas aprendidas: minúsculas, sin tildes ni símbolos, palabra clave.
  const clean = merchant
    .toLowerCase()
    .normalize("NFD").replace(DIACRITICS, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.split(" ").filter((w) => w.length > 2)[0] || clean;
}

/**
 * Categoriza una transacción.
 * @param {{merchant?:string, description?:string, amount?:number, type?:string}} tx
 * @param {(token:string)=>(string|null)} ruleLookup  Devuelve slug si hay regla del usuario.
 * @returns {{slug:string, source:'rule'|'keyword'|'income'|'fallback'}}
 */
export function categorize(tx, ruleLookup = () => null) {
  const text = `${tx.merchant ?? ""} ${tx.description ?? ""}`.toLowerCase()
    .normalize("NFD").replace(DIACRITICS, "");

  // 1) Regla aprendida del usuario (máxima prioridad).
  const token = normalizeMerchantToken(tx.merchant ?? tx.description ?? "");
  const learned = ruleLookup(token);
  if (learned) return { slug: learned, source: "rule" };

  // 2) Ingreso explícito.
  if (tx.type === "income" || (typeof tx.amount === "number" && tx.amount > 0)) {
    if (tx.type === "income" || INCOME_HINTS.some((h) => text.includes(h))) {
      return { slug: "ingresos", source: "income" };
    }
  }

  // 3) Palabras clave de comercio.
  for (const [slug, words] of KEYWORD_RULES) {
    if (words.some((w) => text.includes(w.trim()))) return { slug, source: "keyword" };
  }

  // 4) Sin categoría.
  return { slug: "sin-categoria", source: "fallback" };
}
