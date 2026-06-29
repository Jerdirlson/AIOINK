# 02 · Arquitectura y stack

## Diagrama lógico

```
┌─────────────────┐        HTTPS / JWT        ┌──────────────────────┐
│   App iOS        │ ───────────────────────▶ │   Backend (FastAPI)   │
│  Swift / SwiftUI │                           │                       │
│  - Sign in Apple │ ◀───── push (APNs) ────── │  - API REST           │
│  - WKWebView     │                           │  - Auth / JWT         │
│    (Belvo widget)│                           │  - Sync & ingesta     │
└─────────────────┘                            │  - Categorización     │
                                               │  - Webhooks Belvo     │
                                               └───────┬───────┬──────┘
                                                       │       │
                                          ┌────────────▼─┐  ┌──▼─────────┐
                                          │ PostgreSQL    │  │  Belvo API │
                                          └───────────────┘  └────────────┘
```

## Stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| App iOS | **Swift + SwiftUI** | Nativo: mejor UX financiera, `Charts`, Face ID, APNs, Sign in with Apple. |
| Backend | **Python + FastAPI** | SDK oficial de Belvo en Python, async, base para ML/enriquecimiento futuro. |
| Base de datos | **PostgreSQL** gestionado (Supabase / Neon / RDS) | Relacional, transaccional, cifrado en reposo. |
| Auth | **Sign in with Apple** + JWT | Login nativo sin fricción en iOS. |
| Agregador | **Belvo** | Único viable en Colombia, con categorización incluida. |
| Jobs/colas | Celery o RQ (+ Redis) / cron | Procesar webhooks y sync histórico de forma asíncrona. |
| Push | **APNs** | Alertas de gasto, presupuesto, nuevas transacciones. |
| Hosting | Fly.io / Render / Railway (MVP) → AWS (escala) | Despliegue simple con HTTPS y secretos gestionados. |

> **Alternativa de backend:** Node.js / NestJS (TypeScript) si se prefiere TS end-to-end. Belvo tiene SDK en Node.

## Principios de arquitectura

- **Backend obligatorio**: las llaves secretas de Belvo y los webhooks viven en el servidor, nunca en la app.
- **Modelo de datos normalizado** independiente del banco (cada banco se mapea a un modelo común).
- **Idempotencia** en la ingesta (clave única por transacción de Belvo) para evitar duplicados.
- **Separación de capas**: API ↔ servicios de dominio ↔ repositorios ↔ clientes externos (Belvo).
