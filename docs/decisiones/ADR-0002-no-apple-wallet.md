# ADR-0002 · Captura de gastos con Apple Wallet vía Atajos (Shortcuts)

- **Estado:** Aceptada (corrige una versión anterior que descartaba la Wallet)
- **Fecha:** 2026-06-29

## Contexto

La idea original era "conectarse a la Wallet de iOS" para auto-registrar las compras con tarjeta.
En una primera versión de este ADR se concluyó —de forma **incorrecta**— que esto era imposible.

## Corrección importante

Sí existe una vía nativa: desde **iOS 17**, la app **Atajos** tiene una automatización tipo
**"Transacción"** que se dispara con cada pago de Apple Pay (NFC) y entrega **tarjeta, comercio y
monto**. Es el mecanismo que usan apps como MoneyCoach, TravelSpend y BudgetBakers (y MonAI).

## Decisión

Usar la **automatización "Transacción" de Atajos** como **fuente principal de auto-registro en el
MVP**. El atajo hace un `POST` a nuestro backend con los datos de cada transacción.

## Capacidades y límites

**Captura:** tarjeta/pase, comercio (merchant) y monto. Filtrable por tarjeta, categoría o comercio.

**Límites:**
- Solo transacciones de **Apple Pay por NFC** (tap con iPhone/Watch). No captura compras online por
  navegador ni pagos con tarjeta física sin Apple Pay.
- El monto llega como texto → requiere limpieza/parseo.
- El usuario configura la automatización **una vez**.

## Relación con Belvo

No se descarta Belvo (ver [ADR-0001](ADR-0001-belvo-como-agregador.md)). Estrategia por capas:
- **MVP:** captura por Atajos (gratis, inmediata).
- **Fase posterior:** Belvo para cobertura total (compras online, tarjeta física, saldos,
  categorización avanzada).

## Consecuencias

- El backend necesita un endpoint de ingesta autenticado por token (`POST /api/ingest/shortcut`).
- Hay que entregar al usuario un **atajo preconfigurado** + guía de instalación.
- Los gastos en **efectivo** y compras **online** siguen requiriendo registro manual (o Belvo).
