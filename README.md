# IAOINK — App de Finanzas Personales

App de finanzas personales (estilo MonAI) para **iOS** que se conecta al **banco** (vía Belvo) para
auto-registrar y **autocategorizar** los movimientos, con presupuestos, metas e insights.

> **Estado:** fase de diseño. Aún no hay código de aplicación. La documentación vive en [`docs/`](docs/).

## Resumen rápido

| | |
|---|---|
| **País** | Colombia |
| **Plataforma** | iOS (Swift / SwiftUI) |
| **Backend** | Python / FastAPI + PostgreSQL |
| **Agregador bancario** | [Belvo](https://belvo.com) (sandbox → producción) |
| **Auth** | Sign in with Apple |

## Documentación

- [01 · Visión y alcance](docs/01-vision-alcance.md)
- [02 · Arquitectura y stack](docs/02-arquitectura-stack.md)
- [03 · Módulos](docs/03-modulos.md)
- [04 · Modelo de datos](docs/04-modelo-datos.md)
- [05 · Integración Belvo](docs/05-integracion-belvo.md)
- [06 · Seguridad y cumplimiento](docs/06-seguridad-cumplimiento.md)
- [07 · Roadmap](docs/07-roadmap.md)
- [08 · Captura con Apple Wallet (Atajo)](docs/08-captura-apple-wallet-shortcut.md)
- [Decisiones de arquitectura (ADRs)](docs/decisiones/)

## Fuentes de auto-registro

1. **Apple Wallet vía Atajo "Transacción"** (iOS 17+) — vía **principal del MVP**: gratis, nativa,
   captura compras con Apple Pay (NFC). Ver [doc 08](docs/08-captura-apple-wallet-shortcut.md) y
   [ADR-0002](docs/decisiones/ADR-0002-no-apple-wallet.md).
2. **Belvo (open banking)** — fase posterior para cobertura total (online, tarjeta física, saldos).
   Ver [ADR-0001](docs/decisiones/ADR-0001-belvo-como-agregador.md).
3. **Registro manual** — efectivo y casos no cubiertos.
