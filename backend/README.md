# IAOINK · Backend MVP

Backend mínimo **sin dependencias**: Node 22.5+ con `node:sqlite` y `node:http`.
Recibe las compras que captura el **Atajo de Apple Wallet**, las **autocategoriza** y las expone a la app.

## Correr

```powershell
cd backend
node src/server.mjs           # http://localhost:8787
# variables opcionales:  PORT, IAOINK_TOKEN, IAOINK_DB
```

Prueba del núcleo (sin servidor):

```powershell
node src/selftest.mjs
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET  | `/health` | — | Estado |
| GET  | `/api/categories` | — | Lista de categorías |
| POST | `/api/ingest/shortcut` | Bearer | **Ingesta desde el Atajo de Apple Wallet** |
| POST | `/api/transactions` | Bearer | Registro manual (efectivo/online) |
| GET  | `/api/transactions` | Bearer | Últimas transacciones |
| PATCH| `/api/transactions/:id` | Bearer | Recategorizar (**aprende** una regla por comercio) |
| GET  | `/api/summary` | Bearer | Totales y gasto por categoría |

Auth: header `Authorization: Bearer <token>`. En el MVP el token es `IAOINK_TOKEN`
(por defecto `demo-token-cambia-esto`); en producción se genera uno por usuario en la app.

### Ejemplo: lo que envía el Atajo

```http
POST /api/ingest/shortcut
Authorization: Bearer <token>
Content-Type: application/json

{ "merchant": "EXITO POBLADO", "amount": 53400, "card": "Visa Bancolombia" }
```

Respuesta: `{ "id": 1, "category": "mercado", "auto_categorized": true }`

## Autocategorización

`src/categorize.mjs` resuelve la categoría en este orden:
1. **Regla aprendida** del usuario (si antes recategorizó ese comercio).
2. **Palabras clave** de comercios colombianos (Éxito, Rappi, Uber, Claro, Netflix, etc.).
3. `sin-categoria` si no hay coincidencia.

Cuando el usuario recategoriza (`PATCH`), se guarda una regla `comercio → categoría` y las
próximas compras de ese comercio se clasifican solas.

## Arquitectura / siguientes pasos

- **Datos:** SQLite local en el MVP → migrar a **PostgreSQL** en producción (mismo esquema, ver
  [`docs/04-modelo-datos.md`](../docs/04-modelo-datos.md)).
- **Conexión con el iPhone:** exponer el backend con una URL pública (túnel tipo ngrok en dev, o
  hosting en Fly.io/Render) para que el Atajo pueda hacer `POST`. Ver
  [`docs/08-captura-apple-wallet-shortcut.md`](../docs/08-captura-apple-wallet-shortcut.md).
- **Fase posterior:** ingesta vía **Belvo** para cobertura total (online, tarjeta física, saldos).
