# ADR-0001 · Belvo como agregador bancario

- **Estado:** Aceptada
- **Fecha:** 2026-06-27

## Contexto

La app necesita conectar bancos en **Colombia** para auto-registrar transacciones. Las opciones de
open banking varían por región: Plaid (EE.UU.), Tink/TrueLayer/GoCardless (Europa/PSD2),
Belvo (LatAm). En Colombia **no aplica PSD2**.

## Decisión

Usar **Belvo** como agregador bancario.

## Razones

- Cubre Colombia (60+ instituciones en LatAm: Bancolombia, Davivienda, BBVA, Nequi, etc.).
- Trae **categorización lista** (15 categorías + 94 subcategorías en español, ~85% precisión),
  **gastos recurrentes** e **ingresos** → reduce el trabajo de categorización propio.
- Tiene **sandbox gratuito** para desarrollar.

## Consecuencias

- Se requiere **backend propio** para las llaves secretas y los webhooks.
- Costo recurrente por *link* en producción (cotizar antes de lanzar).
- Dependencia de un proveedor externo para la disponibilidad de los datos bancarios.
