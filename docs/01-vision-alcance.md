# 01 · Visión y alcance

## Qué es IAOINK

Una app de finanzas personales para iOS que registra y categoriza los gastos e ingresos del usuario con la menor fricción manual posible, combinando captura automática (Apple Pay, SMS bancario, agregación bancaria vía Belvo) con captura asistida por IA (voz, foto de recibo, texto libre, WhatsApp).

Referencia funcional: capturas de una app existente ("AI Money", Colombia) compartidas por el usuario el 2026-08-01. Se usan como inspiración de producto y UX, no se copia marca ni assets — el nombre, logo y diseño visual final de IAOINK son propios.

## Usuario objetivo

- Persona en Colombia con cuentas bancarias locales, que paga con tarjeta física, Apple Pay y efectivo.
- Quiere ver en un vistazo: saldo total, en qué se está yendo la plata este mes, y si se está pasando del presupuesto.
- No quiere digitar cada gasto a mano — valora que la app "adivine" la categoría y el monto.

## Problema

Las apps de control de gastos tradicionales dependen de que el usuario registre todo manualmente, lo cual se abandona en pocas semanas. La fricción de captura es la causa principal de abandono, no la falta de reportes.

## Solución

Múltiples canales de captura de baja fricción que alimentan un mismo modelo de datos:

1. **Automático real:** Atajo de iOS que detecta transacciones de Apple Pay (NFC) y las envía al backend. Agregación bancaria vía Belvo (fase posterior) para cuentas, saldos y movimientos que no pasan por Apple Pay.
2. **Semi-automático:** lectura de SMS bancarios (parseo de texto), bot de WhatsApp para registrar gastos por chat.
3. **Asistido por IA:** dictado por voz, foto de un recibo (OCR), nota de texto libre — en los tres casos un modelo extrae comercio/monto/categoría.
4. **Manual:** formulario clásico, siempre disponible como fallback.

Sobre esa base de datos: dashboard, presupuestos por categoría, metas de ahorro, seguimiento de deudas y reportes (barras por categoría, distribución en dona, saldo/ingresos/gastos mensuales).

## Alcance del MVP

Incluye:
- Registro manual de transacciones (cuentas, categorías, montos).
- Captura automática vía Atajo de Apple Pay.
- Dashboard de inicio (cuentas, saldo, gastos del mes, últimas transacciones).
- Listado de transacciones con filtros por categoría/cuenta/fecha.
- Reportes básicos (gasto por categoría, saldo mensual).
- Backend propio (NestJS + PostgreSQL) como fuente de verdad.
- App iOS nativa (SwiftUI), un solo usuario por cuenta (sin multi-usuario/hogar todavía).

Explícitamente fuera del MVP (fases posteriores, ver [08-roadmap.md](08-roadmap.md)):
- Agregación bancaria vía Belvo (requiere aprobación de producción).
- Bot de WhatsApp, SMS bancario automático, Scan AI, Mic AI, Notas AI.
- Presupuestos, metas de ahorro y deudas como módulos completos (el MVP los deja ver vacíos/placeholder).
- Multi-moneda y multi-país (se arranca fijo en COP / Colombia).
- Plan Pro / monetización.

## No-objetivos

- No es un agregador de inversiones ni de criptomonedas.
- No es multi-usuario/compartido (billetera familiar) en esta fase.
- No busca reemplazar la banca — nunca inicia transferencias ni pagos, solo lee y registra.

## Métrica de éxito del MVP

Que el usuario registre gastos por al menos 3 semanas seguidas sin abandonar la app, gracias a que la mayoría de transacciones entran solas (Apple Pay) y las manuales toman menos de 10 segundos.
