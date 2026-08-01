# ADR-0005 · Flujo de desarrollo: Windows (Claude Code) + Mac (Xcode)

**Estado:** Aceptado
**Fecha:** 2026-08-01

## Contexto

El usuario tiene un Mac disponible para compilar y probar la app iOS, pero prefiere hacer el desarrollo activo (incluido escribir código Swift) en este entorno de trabajo (Windows, Claude Code), no directamente en el Mac.

## Decisión

- Todo el desarrollo del día a día —backend y app iOS— se hace en Windows vía Claude Code.
- El repositorio Git es la única fuente de verdad compartida entre ambos entornos.
- El Mac se usa puntualmente para: `git pull`, abrir el proyecto en Xcode, compilar, correr en simulador/dispositivo, y depurar errores específicos de compilación o de comportamiento en tiempo de ejecución que no se puedan detectar solo leyendo el código.

## Consecuencias

- El backend (Node/TypeScript) se puede desarrollar, correr y testear completamente en Windows — sin restricciones.
- El código Swift/SwiftUI **no se puede compilar ni ejecutar desde Windows**. Cualquier cambio en `ios/` queda "no verificado" hasta que se compile en el Mac; hay que prestar especial atención a la sintaxis y disponibilidad de APIs de SwiftUI/iOS 17+ al escribirlo.
- Conviene mantener un ciclo corto: cambios pequeños en `ios/`, sincronizar y compilar en el Mac con frecuencia, en vez de acumular muchos cambios sin verificar.
- No se requiere una Mac en la nube (MacStadium, GitHub Actions macOS runner) para el desarrollo — sí podría evaluarse más adelante para CI (compilación automática en cada push), pero no es necesario ahora.
