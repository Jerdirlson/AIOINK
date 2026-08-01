# ADR-0001 · Belvo como agregador bancario

**Estado:** Aceptado
**Fecha:** 2026-06-27 (reafirmado 2026-08-01)

## Contexto

Para cubrir gastos que no pasan por Apple Pay (tarjeta física, compras en línea, saldos reales de cuentas), se necesita un agregador bancario para Colombia.

## Decisión

Usar **Belvo** como agregador bancario, en fase posterior al MVP (ver [08-roadmap.md](../08-roadmap.md)).

## Alternativas consideradas

- **Plaid:** cobertura de Latinoamérica/Colombia más limitada que Belvo.
- **Construir scraping propio por banco:** frágil, alto costo de mantenimiento, riesgo legal/ToS de cada banco.
- **No agregar bancos, depender solo de Apple Pay + manual:** descarta de plano compras con tarjeta física y en línea, que son una porción grande del gasto real.

## Consecuencias

- Sandbox de Belvo es gratis, permite construir y probar la integración sin costo.
- Producción requiere aprobación de Belvo y un plan de pago — impacta el modelo de precios (ver Fase 6 en el roadmap).
- El backend nunca almacena credenciales bancarias directamente (las maneja el widget de Belvo) — ver [07-seguridad-cumplimiento.md](../07-seguridad-cumplimiento.md).
