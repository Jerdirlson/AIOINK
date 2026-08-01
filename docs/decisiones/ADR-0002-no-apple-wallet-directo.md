# ADR-0002 · No se puede leer Apple Wallet directamente

**Estado:** Aceptado
**Fecha:** 2026-06-27 (reafirmado 2026-08-01)

## Contexto

La intención inicial del usuario era "conectarse a la wallet de iOS" para capturar pagos de Apple Pay automáticamente.

## Decisión

Apple **no** expone una API pública para leer el historial de transacciones de Apple Wallet/Apple Pay desde una app de terceros. La vía real y soportada es la automatización **"Transacción"** de la app Atajos (Shortcuts) de iOS, disponible desde iOS 17, que se dispara justo después de un pago con Apple Pay y puede ejecutar acciones (incluyendo un `POST` HTTP a un backend propio).

## Consecuencias

- Solo se capturan pagos **NFC** (Apple Pay físico/contactless) — no compras en línea con la tarjeta guardada, ni tarjeta física sin usar Apple Pay.
- Requiere mínimo iOS 17 (ver [ADR-0004](ADR-0004-ios-nativo-swiftui.md)).
- El usuario debe instalar/activar el Atajo manualmente la primera vez (no se puede provisionar automáticamente desde la app) — la app debe guiar ese setup y mostrar su estado (activo/inactivo) en Perfil.
- Esta limitación es la razón principal por la que Belvo (ADR-0001) es necesario para cobertura completa.
