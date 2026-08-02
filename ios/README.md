# App iOS de IAOINK

SwiftUI, mínimo iOS 17. Ver [`docs/09-diseno-sistema.md`](../docs/09-diseno-sistema.md)
para las reglas de diseño y [`ADR-0005`](../docs/decisiones/ADR-0005-flujo-desarrollo-windows-mac.md)
para el flujo de trabajo Windows + Mac.

## Abrir el proyecto (en el Mac)

No se versiona el `.xcodeproj`: se genera con [XcodeGen](https://github.com/yonaskolb/XcodeGen)
a partir de `project.yml`. Un `.xcodeproj` en git produce diffs ilegibles y
conflictos constantes.

```bash
brew install xcodegen     # una sola vez
cd ios
xcodegen generate
open IAOINK.xcodeproj
```

Cuando se agregan o mueven archivos, basta volver a correr `xcodegen generate`.

**Si prefieres no instalar XcodeGen:** crea un proyecto nuevo en Xcode
(*File → New → Project → iOS App*, SwiftUI, nombre `IAOINK`) dentro de `ios/`,
borra los archivos que genera y arrastra la carpeta `IAOINK/` al navegador
eligiendo *Create folder references*. Xcode 16 sincroniza el contenido solo.

## Conectar con el backend

La app apunta por defecto a `http://localhost:3000/api`, que funciona en el
**simulador** si el backend corre en el mismo Mac:

```bash
cd backend && docker compose up -d && npm run start:dev
```

Para probar en un **iPhone físico**, `localhost` es el propio teléfono. Hay que
apuntar a la IP del Mac en la red local (`ipconfig getifaddr en0`) y guardarla
sin recompilar:

```swift
// Por ejemplo desde un breakpoint, o temporalmente en IAOINKApp.init()
UserDefaults.standard.set("http://192.168.1.42:3000/api", forKey: "apiBaseURL")
```

El `Info.plist` habilita HTTP solo hacia la red local
(`NSAllowsLocalNetworking`), no hacia internet.

## Estructura

```
IAOINK/
  App/            Punto de entrada, estado de sesión, TabView raíz
  DesignSystem/   Tokens de color y espaciado, paleta de gráficos, formateo
  Models/         Modelos Codable que reflejan la API
  Networking/     Cliente HTTP, rutas, Keychain, errores
  Features/
    Auth/         Login y registro
    Home/         Dashboard
    Transactions/ Listado, fila compartida y alta manual
    Reports/      (pendiente)
    Profile/      Perfil básico
  Resources/      Asset catalog
```

## Estado

| Pantalla | Estado |
|---|---|
| Login / registro | Funcional |
| Inicio | Cuentas, KPIs del mes y últimas transacciones |
| Transacciones | Listado agrupado por día, filtro por categoría, swipe para eliminar, paginación |
| Nuevo movimiento | Formulario completo (gasto e ingreso) |
| Reportes | Placeholder — los endpoints ya existen |
| Perfil | Datos básicos y cerrar sesión |

## Decisiones que conviene conocer

**Los montos son enteros en centavos**, igual que en el backend. `Money` es el
único punto donde se convierten a texto. El peso colombiano se muestra sin
decimales aunque su unidad menor sea el centavo.

**El botón de añadir va en la toolbar**, no flotando sobre la tab bar: un FAB
circular superpuesto es un patrón de Material Design, no de iOS.

**Los colores de gráficos no son los `system*` de Apple.** Esos son colores de
interfaz y no pasan las verificaciones para datos (banda de luminosidad,
contraste, separación para daltonismo). `ChartPalette` tiene los pasos
corregidos y validados, en claro y oscuro por separado.

**Las fechas de la API traen milisegundos** (`2026-08-02T03:26:50.814Z`), que
la estrategia `.iso8601` de Foundation no acepta. `APIClient` prueba con y sin
fracción de segundo.

**El JWT vive en el Keychain**, no en `UserDefaults`. Si el servidor responde
401, la sesión se limpia sola y la app vuelve al login.

## Pendiente

- Pantalla de Reportes con Swift Charts (reglas en docs/09 §8).
- Crear y editar cuentas desde la app.
- Editar una transacción existente.
- Gestión del token del Atajo de Apple Pay desde Perfil.
- Pruebas unitarias de `Money` y de la decodificación de fechas.
