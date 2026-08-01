# ADR-0003 · Backend en TypeScript + NestJS + Prisma + PostgreSQL

**Estado:** Aceptado
**Fecha:** 2026-06-27 (reafirmado 2026-08-01)

## Contexto

Se necesita un backend definitivo (más allá del MVP exploratorio en Node plano + `node:sqlite`) que sirva de fuente de verdad para la app iOS y las integraciones (Belvo, WhatsApp, etc.).

## Decisión

**TypeScript + NestJS + Prisma + PostgreSQL.**

## Razones

- El usuario maneja Python y Node; se eligió Node por continuidad directa con el MVP exploratorio ya escrito en `backend/src/*.mjs`.
- El usuario no tiene Python instalado en su entorno de desarrollo actual.
- Belvo ofrece SDK oficial para Node.
- NestJS aporta estructura modular, conveniente dado el número de módulos del producto (cuentas, transacciones, categorías, presupuestos, ahorros, deudas, reportes, integraciones externas) — ver [03-modulos-funcionalidades.md](../03-modulos-funcionalidades.md).
- Prisma da migraciones tipadas y un cliente type-safe sobre PostgreSQL, reduciendo errores en un dominio (dinero) donde los tipos importan.

## Consecuencias

- El MVP exploratorio en Node plano + SQLite se migra a NestJS + PostgreSQL cuando el proyecto pase de "documentar" a "construir" (Fase 0/1 del roadmap).
- Se puede desarrollar y correr el backend completo en Windows, sin depender del Mac.
