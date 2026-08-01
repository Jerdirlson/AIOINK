# 02 · Arquitectura y stack

## Resumen

```
┌─────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│   iOS App        │ ────────────────────────▶ │   Backend (NestJS)    │
│   Swift/SwiftUI   │ ◀──────────────────────── │   Prisma + PostgreSQL  │
└─────────────────┘                            └──────────────────────┘
        ▲                                                 │
        │ Atajo de iOS (automatización                    │ SDK Node
        │ "Transacción" → POST)                           ▼
        │                                        ┌──────────────────┐
   Apple Pay (NFC)                                │      Belvo         │
                                                   │ (agregador bancario)│
                                                   └──────────────────┘
```

## iOS — Swift/SwiftUI nativo

- **Por qué nativo y no cross-platform:** ver [ADR-0004](decisiones/ADR-0004-ios-nativo-swiftui.md). Resumen: mejor integración con Atajos/Shortcuts, notificaciones, Apple Pay y rendimiento; el usuario tiene Mac disponible para compilar.
- **Mínimo iOS 17** — requisito de la automatización de Atajos usada para capturar Apple Pay.
- Arquitectura recomendada: SwiftUI + MVVM, `URLSession`/`async-await` para networking, `Keychain` para tokens de sesión.

## Backend — TypeScript + NestJS + Prisma + PostgreSQL

- Ver [ADR-0003](decisiones/ADR-0003-backend-typescript-nestjs.md) para el razonamiento completo.
- NestJS por estructura modular (útil dado el número de módulos: cuentas, transacciones, presupuestos, ahorros, deudas, reportes, integraciones).
- Prisma como ORM/migraciones sobre PostgreSQL.
- API REST (JSON) consumida por la app iOS; autenticación con JWT.

## Flujo de desarrollo: Windows + Mac

Decisión confirmada 2026-08-01 (ver [ADR-0005](decisiones/ADR-0005-flujo-desarrollo-windows-mac.md)): el desarrollo día a día —incluido el código Swift— se hace en este entorno (Windows, Claude Code), y el Mac se usa puntualmente para compilar/ejecutar en Xcode y probar en simulador o dispositivo.

Esto implica:
- El repo es la única fuente de verdad; el flujo es escribir aquí → commit/push → `git pull` en el Mac → abrir en Xcode → compilar.
- No se puede validar compilación de Swift desde este entorno — cualquier cambio en `ios/` se considera "no verificado" hasta que se compile en el Mac. Hay que ser especialmente cuidadoso con sintaxis y APIs de SwiftUI.
- El backend (Node/TypeScript) sí se puede correr, testear y depurar completamente en Windows.

## Hosting

Pendiente de decidir (no bloquea desarrollo local). Candidatos:
- **Railway** (recomendado): Postgres + backend en un solo lugar, deploy simple desde Git.
- Alternativa: Render (backend) + Neon (Postgres serverless).
- Alternativa: Fly.io.

## Integraciones externas

| Servicio | Uso | Fase |
|---|---|---|
| Belvo | Agregación bancaria Colombia (cuentas, saldos, movimientos) | Posterior al MVP |
| Atajos de iOS | Captura de transacciones Apple Pay (NFC) | MVP |
| WhatsApp Business API | Bot para registrar gastos por chat | Posterior |
| OCR (proveedor por definir) | "Scan AI" — lectura de recibos | Posterior |
| Speech-to-text + LLM | "Mic AI" / "Notas AI" — extracción de transacción desde voz o texto libre | Posterior |

## Repositorio

Monorepo: `backend/` + `ios/` + `docs/` + `tools/`. Repo git: https://github.com/Jerdirlson/AIOINK.
