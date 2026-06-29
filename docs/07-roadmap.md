# 07 · Roadmap

Entrega por fases, priorizando validar el producto barato y rápido antes de incurrir en costos de Belvo.

## Fase 0 — Fundaciones
- Repos (app iOS + backend), CI básico.
- Cuenta **Apple Developer** (~$99 USD/año).
- Cuenta **Belvo sandbox** (gratis).
- Esquema inicial de base de datos.

## Fase 1 — MVP manual *(funciona sin banco)*
- Auth con Sign in with Apple.
- CRUD de transacciones manuales.
- Categorías base.
- Dashboard básico.
- **Objetivo:** validar el producto rápido y barato.

## Fase 2 — Integración Belvo (sandbox)
- Belvo Connect Widget en la app.
- Pull histórico de cuentas y transacciones.
- Webhooks + cola + ingestión idempotente con bancos de prueba.

## Fase 3 — Categorización + insights
- Categoría de Belvo + reglas/feedback del usuario + (opcional) fallback LLM.
- Gastos recurrentes e ingresos.
- Gráficas y dashboard completo.

## Fase 4 — Presupuestos, metas y notificaciones
- Presupuestos por categoría, metas de ahorro.
- Push (APNs) y alertas.

## Fase 5 — Producción
- Belvo en producción (revisión de cumplimiento y pricing).
- Endurecimiento de seguridad, política de datos.
- Publicación en App Store.

## Costos a tener presentes
| Concepto | Costo |
|----------|-------|
| Belvo | Por *link*/mensual (cotizar; sandbox gratis para desarrollar) |
| Apple Developer Program | ~$99 USD/año (obligatorio para publicar) |
| Hosting + Postgres | Desde gratis/bajo costo en Fly.io/Render/Neon en MVP |
