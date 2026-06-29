// Prueba mínima de conexión con Belvo (Node 18+, sin dependencias: usa fetch nativo).
//
// Qué hace:
//   1. Verifica que tus llaves de Belvo autentican.
//   2. Lista los bancos disponibles en Colombia.
//   3. (Opcional) Crea un LINK de prueba en sandbox y baja transacciones.
//
// IMPORTANTE:
//   - SANDBOX usa bancos FICTICIOS, no tu banco real. Sirve para validar el flujo.
//   - Para tu banco real necesitas llaves de PRODUCCION (cuenta Belvo aprobada).
//
// Uso (PowerShell, desde la raíz del proyecto):
//   $env:BELVO_SECRET_ID="...."; $env:BELVO_SECRET_PASSWORD="...."; node tools/test_belvo.mjs

const BASE_URLS = {
  sandbox: "https://sandbox.belvo.com",
  development: "https://development.belvo.com",
  production: "https://api.belvo.com",
};

const {
  BELVO_SECRET_ID: secretId,
  BELVO_SECRET_PASSWORD: secretPassword,
  BELVO_ENV: env = "sandbox",
  BELVO_TEST_INSTITUTION: inst,
  BELVO_TEST_USERNAME: user,
  BELVO_TEST_PASSWORD: pwd,
} = process.env;

if (!secretId || !secretPassword) {
  console.error("ERROR: define BELVO_SECRET_ID y BELVO_SECRET_PASSWORD.");
  console.error("Crea una cuenta sandbox en https://dashboard.belvo.com y genera tus llaves.");
  process.exit(1);
}

const base = BASE_URLS[env] ?? BASE_URLS.sandbox;
const auth = "Basic " + Buffer.from(`${secretId}:${secretPassword}`).toString("base64");

async function api(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function main() {
  console.log(`== Entorno Belvo: ${env} ==\n`);

  // 1) Auth + 2) Instituciones de Colombia
  console.log("[1/3] Verificando auth y listando bancos de Colombia...");
  let { status, data } = await api("GET", "/api/institutions/?country_codes=CO&page_size=100");
  if (status !== 200) {
    console.error(`  FALLO (${status}):`, data);
    console.error("  Revisa que las llaves correspondan al entorno elegido.");
    process.exit(1);
  }
  const results = data.results ?? [];
  console.log(`  OK. ${results.length} instituciones en Colombia:`);
  for (const i of results) {
    console.log(`    - ${(i.name ?? "").padEnd(28)} display='${i.display_name}'  type=${i.type}`);
  }

  // 3) (Opcional) crear link de prueba y bajar transacciones
  if (!(inst && user && pwd)) {
    console.log("\n[2/3] (Saltado) Para crear un LINK de prueba define BELVO_TEST_INSTITUTION/");
    console.log("       BELVO_TEST_USERNAME/BELVO_TEST_PASSWORD (credenciales de prueba del sandbox).");
    console.log("       Consulta: https://developers.belvo.com/docs/test-in-sandbox");
    console.log("\n[3/3] Listo. La autenticación y el acceso a la API funcionan. ✅");
    return;
  }

  console.log(`\n[2/3] Creando link de prueba en '${inst}'...`);
  ({ status, data } = await api("POST", "/api/links/", {
    institution: inst, username: user, password: pwd, access_mode: "single",
  }));
  if (status !== 200 && status !== 201) {
    console.error(`  FALLO (${status}):`, data);
    process.exit(1);
  }
  const linkId = data.id;
  console.log(`  OK. link_id = ${linkId}`);

  console.log("\n[3/3] Bajando transacciones del link...");
  ({ status, data } = await api("POST", "/api/transactions/", {
    link: linkId, date_from: "2024-01-01",
  }));
  if (status !== 200 && status !== 201) {
    console.error(`  FALLO (${status}):`, data);
    process.exit(1);
  }
  const items = Array.isArray(data) ? data : (data.results ?? []);
  console.log(`  OK. ${items.length} transacciones. Muestra (con categoría de Belvo):`);
  for (const t of items.slice(0, 10)) {
    console.log(`    ${t.value_date}  ${String(t.amount).padStart(12)}  ` +
      `${(t.category ?? "-").padEnd(22)} ${t.description}`);
  }
  console.log("\nConexión y categorización automática verificadas. ✅");
}

main().catch((e) => { console.error(e); process.exit(1); });
