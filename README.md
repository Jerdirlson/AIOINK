# IAOINK

App de finanzas personales para iOS (Colombia) que registra y categoriza gastos con la menor fricción manual posible: captura automática vía Apple Pay y agregación bancaria (Belvo), más captura asistida por IA (voz, foto de recibo, texto libre, WhatsApp).

Proyecto personal, en fase de diseño/documentación — sin código de producto todavía.

## Documentación

1. [Visión y alcance](docs/01-vision-alcance.md)
2. [Arquitectura y stack](docs/02-arquitectura-stack.md)
3. [Módulos y funcionalidades](docs/03-modulos-funcionalidades.md)
4. [Modelo de datos](docs/04-modelo-datos.md)
5. [Integración con Belvo](docs/05-integracion-belvo.md)
6. [Captura multicanal](docs/06-captura-multicanal.md)
7. [Seguridad y cumplimiento](docs/07-seguridad-cumplimiento.md)
8. [Roadmap](docs/08-roadmap.md)

Decisiones de arquitectura: [`docs/decisiones/`](docs/decisiones/).

## Stack (resumen)

- **iOS:** Swift/SwiftUI nativo, mínimo iOS 17.
- **Backend:** TypeScript + NestJS + Prisma + PostgreSQL.
- **Agregador bancario:** Belvo (fase posterior al MVP).
- **Desarrollo:** código en Windows (este entorno) + compilación/pruebas de iOS en Mac vía Xcode — ver [ADR-0005](docs/decisiones/ADR-0005-flujo-desarrollo-windows-mac.md).

## Estructura del repo (planeada)

```
backend/    API en NestJS
ios/        App SwiftUI
docs/       Documentación de producto y arquitectura
tools/      Scripts auxiliares (pruebas de integraciones, etc.)
```
