# 01 · Visión y alcance

## Problema

Llevar las finanzas personales a mano es tedioso y se abandona. El usuario quiere que la app:
1. Se **conecte al banco** y auto-registre lo que se compra con tarjeta (igual que MonAI).
2. **Autocategorice** las transacciones sin esfuerzo manual.
3. Dé **visibilidad y control**: en qué se gasta, presupuestos, suscripciones, metas.

## Visión

Una app de finanzas personales en iOS que, tras conectar el banco una sola vez, mantiene un panorama
financiero actualizado y categorizado automáticamente, con alertas e insights accionables.

## Usuarios y contexto

- **Usuario inicial:** el autor del proyecto (Colombia), desarrollador con experiencia.
- **Mercado:** Colombia (define el agregador bancario = Belvo).

## Alcance del MVP

**Incluye**
- Login con Sign in with Apple.
- Conexión de uno o varios bancos vía Belvo.
- Ingesta automática de transacciones + categorización.
- Registro manual de gastos en efectivo.
- Dashboard de gastos/ingresos por categoría.
- Presupuestos básicos por categoría.

**Fuera del MVP (después)**
- Metas de ahorro avanzadas y proyecciones.
- Fallback de categorización con LLM.
- Multi-moneda real (el MVP asume COP).
- Versión Android / web.

## No-objetivos

- No es una app de inversión/trading.
- No almacena números de tarjeta (PAN) ni credenciales bancarias.
- No accede a Apple Wallet (no es posible para terceros).
