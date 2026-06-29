# 05 · Integración Belvo

[Belvo](https://belvo.com) es el agregador de open finance líder en LatAm y el único viable en Colombia.
Cubre 60+ instituciones en México, Brasil y Colombia (Bancolombia, Davivienda, BBVA, Banco de Bogotá,
Nequi, etc.).

## Capacidades que reutilizamos

- **Categorización lista:** 15 categorías + 94 subcategorías en español, ~85% de precisión (NLP).
- **Gastos recurrentes:** detecta suscripciones (Netflix, gimnasio) y servicios (luz, teléfono).
- **Ingresos:** insights de fuentes de ingreso de los últimos 365 días.

→ Gran parte de la "autocategorización" **no se construye desde cero**; se consume de Belvo y se le
añade una capa de reglas/correcciones del usuario.

## Flujo de conexión

1. Backend pide a Belvo un `access_token` temporal para el widget.
2. App abre el **Belvo Connect Widget** en `WKWebView`; el usuario elige banco y se autentica **dentro del widget** (sus credenciales nunca pasan por nuestra app/backend).
3. Belvo devuelve un `link_id` (con `access_mode = recurrent`).
4. Backend hace **pull histórico** de cuentas, balances y transacciones.
5. Belvo notifica nuevas transacciones por **webhook** → cola → ingestión idempotente.

## Endpoints relevantes

- `POST /api/token/` — token del widget.
- `Links`, `Accounts`, `Transactions` — datos base.
- `Enrichment`: **Transactions categorization**, **Recurring Expenses**, **Incomes**.
- **Webhooks**: `historical_update` y eventos de nuevas transacciones (validar firma).

## Operación

- Empezar en **sandbox** (gratis) con bancos de prueba antes de producción.
- **Cotizar pricing** de producción (modelo por *link*/mensual) — define viabilidad económica.
- Manejar estados de *link*: token vencido / requiere re-login (re-conexión guiada en la app).

## Referencias

- [Banking](https://belvo.com/products/banking/)
- [Enrichment overview](https://developers.belvo.com/developer_resources/enrichment-overview)
- [Recurring expenses](https://belvo.com/products/recurring-expenses/)
- [API docs](https://developers.belvo.com/apis/belvoopenapispec)
- [Categorización (blog)](https://belvo.com/blog/data-categorization-powered-open-banking/)
