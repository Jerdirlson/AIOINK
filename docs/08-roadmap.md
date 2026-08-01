# 08 · Roadmap por fases

No lleva fechas — el ritmo depende de disponibilidad del usuario (proyecto personal). Cada fase asume que la anterior está usable, no necesariamente "perfecta".

## Fase 0 — Fundaciones (actual)

- Documentación de producto y arquitectura (este set de docs).
- Backend base: NestJS + Prisma + PostgreSQL corriendo local, modelo de datos del MVP migrado.
- Proyecto iOS base (SwiftUI), navegación de las 4 tabs con datos mock.

## Fase 1 — MVP funcional

- Auth (registro/login).
- CRUD de cuentas, categorías y transacciones (manual).
- Dashboard de Inicio con datos reales.
- Listado de Transacciones con filtros básicos.
- Reportes: saldo/ingresos/gastos mensuales + barras por categoría.
- Atajo de iOS para Apple Pay conectado al backend.
- Perfil básico: datos de usuario, apariencia, cerrar sesión, eliminar cuenta.

**Criterio de salida:** el usuario (Jerdirlson) usa la app en su día a día en vez de la app de referencia, durante al menos 3 semanas.

## Fase 2 — Presupuestos, ahorros y deudas

- Módulo de Presupuestos por categoría con alertas.
- Módulo de Ahorros y metas.
- Módulo de Deudas.
- Gráfico de dona en Reportes + exportación (CSV/PDF).

## Fase 3 — Belvo (agregación bancaria)

- Integración sandbox de Belvo (ver [05-integracion-belvo.md](05-integracion-belvo.md)).
- Flujo de conexión bancaria desde la app.
- Deduplicación entre Belvo, Apple Pay y registros manuales.
- Solicitud de producción a Belvo cuando el flujo esté validado en sandbox.

## Fase 4 — Captura asistida por IA

- Servicio de extracción de transacción desde texto (base común para Mic AI, Notas AI y Scan AI).
- Notas AI y Mic AI en la app.
- Scan AI (OCR de recibos).

## Fase 5 — WhatsApp y SMS

- Bot de WhatsApp Business.
- Canal de SMS bancario (tras resolver el spike técnico de acceso mencionado en [06-captura-multicanal.md](06-captura-multicanal.md)).

## Fase 6 — Monetización y crecimiento

- Plan Pro (paywall, gestión de suscripción).
- Invitar amigos / referidos.
- Multi-moneda y multi-país (si hay demanda fuera de Colombia).

## Explícitamente no planeado todavía

- Multi-usuario / cuentas compartidas de hogar.
- Soporte Android.
- Inversiones / criptomonedas.
