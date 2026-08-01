# ADR-0004 · App iOS nativa en Swift/SwiftUI

**Estado:** Aceptado
**Fecha:** 2026-08-01

## Contexto

Al replantear el proyecto se evaluó si mantener Swift/SwiftUI nativo o cambiar a un framework cross-platform (React Native, Flutter, Expo) que permitiera compilar sin depender de macOS.

## Decisión

Mantener **Swift/SwiftUI nativo**, mínimo iOS 17.

## Razones

- El usuario confirmó tener acceso a un Mac para compilar y probar en Xcode — la restricción de "no tengo Mac" que haría atractivo un framework cross-platform no aplica.
- La captura vía Atajos/Shortcuts ([ADR-0002](ADR-0002-no-apple-wallet-directo.md)) y cualquier integración futura con `Speech` framework (Mic AI, ver [06-captura-multicanal.md](../06-captura-multicanal.md)) se integran mejor y con menos fricción desde Swift nativo.
- Mejor rendimiento y look-and-feel nativo para una app de uso diario.
- No hay plan de soportar Android a corto/mediano plazo (ver [08-roadmap.md](../08-roadmap.md)), que es el principal argumento a favor de cross-platform.

## Consecuencias

- El código Swift se escribe en este entorno (Windows/Claude Code) y se compila/valida en el Mac — ver [ADR-0005](ADR-0005-flujo-desarrollo-windows-mac.md). Ningún cambio en `ios/` se considera verificado hasta compilar en Xcode.
- Si en el futuro se decide soportar Android, implica reescribir el cliente (no hay reuso de código UI entre plataformas).
