# 09 · Sistema de diseño (estilo Apple)

Guía de diseño de la app iOS. El objetivo es que IAOINK se sienta como una app **de Apple**, no como una app multiplataforma portada a iOS.

## 0. Principio rector

Las tres bases de las Human Interface Guidelines:

- **Claridad** — el texto es legible a cualquier tamaño, los íconos son precisos, el contenido manda sobre el adorno.
- **Deferencia** — la interfaz cede el protagonismo al contenido. Nada de cromo pesado, sombras dramáticas ni gradientes decorativos.
- **Profundidad** — la jerarquía se comunica con capas, materiales translúcidos y transiciones, no con bordes y cajas.

Regla práctica que se deriva de eso: **si SwiftUI ya resuelve un patrón, se usa el componente del sistema antes que uno propio.** Un componente custom se justifica solo cuando no existe equivalente nativo.

## 1. Layout y espaciado

- **Grid de 8 pt.** Todos los espaciados son múltiplos de 8 (4 pt permitido para ajustes finos dentro de un componente).
- **Margen lateral estándar:** 16 pt (usar `.padding(.horizontal)` que ya respeta los márgenes del sistema en vez de valores fijos).
- **Safe areas:** siempre respetadas. Nada de contenido interactivo bajo el home indicator o el Dynamic Island.
- **Radio de esquina continuo** (el "squircle" de Apple), nunca circular:
  ```swift
  RoundedRectangle(cornerRadius: 12, style: .continuous)
  ```
  Tarjetas de contenido: 12–16 pt. Elementos pequeños (chips, íconos con fondo): 8–10 pt.

## 2. Tipografía

- **SF Pro** — la fuente del sistema. No se usan fuentes custom.
- **Dynamic Type obligatorio:** se usan *text styles* semánticos, nunca tamaños fijos en pt.

| Elemento | Text style |
|---|---|
| Título de pantalla (large title) | `.largeTitle` |
| Encabezado de sección | `.title3` / `.headline` |
| Monto principal / hero (saldo) | `.largeTitle` o `.title` + `.bold()` |
| Nombre de transacción | `.body` |
| Categoría / subtítulo de fila | `.subheadline` con `.secondary` |
| Monto en fila de transacción | `.body` + `.monospacedDigit()` |
| Etiquetas de eje y leyendas | `.caption` |
| Texto legal / notas | `.footnote` |

- **Cifras siempre con `.monospacedDigit()`** en listas y KPIs, para que los montos queden alineados en columna y no "salten" al actualizarse.
- La app debe verse bien hasta el tamaño de accesibilidad AX5 — los layouts de tarjeta usan `ViewThatFits` o pasan a vertical cuando el texto crece.

## 3. Color

**Regla dura: se usan colores semánticos del sistema, no hex fijos.** Así el modo claro/oscuro y el modo de contraste aumentado funcionan solos.

| Uso | Token |
|---|---|
| Fondo de pantalla agrupada | `Color(.systemGroupedBackground)` |
| Fondo de tarjeta / fila | `Color(.secondarySystemGroupedBackground)` |
| Texto principal | `Color(.label)` |
| Texto secundario | `Color(.secondaryLabel)` |
| Texto terciario / placeholder | `Color(.tertiaryLabel)` |
| Separadores | `Color(.separator)` |
| Barras y overlays | `.ultraThinMaterial` / `.regularMaterial` |

- **Accent color:** un único color de marca definido en el asset catalog, aplicado con `.tint()`. Todo lo interactivo (links, botones, elementos seleccionados) lo hereda.
- **Sombras:** casi ninguna. La separación se logra con el contraste de superficie (`systemGroupedBackground` vs `secondarySystemGroupedBackground`) y con materiales, no con `shadow`.
- Nunca `Color.white` / `Color.black` literales para superficies o texto.

## 4. Iconografía

**SF Symbols, no emojis ni PNGs.** Los símbolos escalan con Dynamic Type, se adaptan a peso y modo oscuro, y tienen soporte de accesibilidad — un emoji no hace nada de eso.

> Delta respecto a las capturas de referencia: esa app usa emojis (🍔 🚗 🏠) como íconos de categoría. Se reemplazan por SF Symbols sobre un círculo de color de la categoría. Si se quiere permitir emoji, que sea una opción del usuario, no el default.

Mapeo inicial de categorías:

| Categoría | SF Symbol |
|---|---|
| Comida | `fork.knife` |
| Carro / transporte | `car.fill` |
| Vivienda | `house.fill` |
| Suscripciones | `play.tv.fill` |
| Salud | `cross.case.fill` |
| Mercado | `cart.fill` |
| Ocio | `figure.walk` |
| Otros | `ellipsis.circle.fill` |

Uso: `.symbolRenderingMode(.hierarchical)` y `.imageScale(.medium)`, alineados a la línea base del texto que acompañan.

## 5. Componentes

| Necesidad | Componente nativo |
|---|---|
| Listas de ajustes / perfil | `List` con `.listStyle(.insetGrouped)` |
| Formulario de nueva transacción | `Form` dentro de un `NavigationStack` |
| Hoja modal | `.sheet` + `.presentationDetents([.medium, .large])` + `.presentationDragIndicator(.visible)` |
| Estado vacío | `ContentUnavailableView` (iOS 17) |
| Búsqueda | `.searchable()` |
| Recargar | `.refreshable()` |
| Acciones en fila (editar/borrar) | `.swipeActions()` |
| Acciones secundarias | `.contextMenu()` |
| Selector de periodo (Mes/Semana/Año) | `Picker` con `.pickerStyle(.segmented)` |
| Filtros | `Menu` con `Picker` adentro |
| Botones | `.buttonStyle(.borderedProminent)` / `.bordered` / `.plain` |

> Delta: las cajas punteadas con "+ Añade tu primer presupuesto" de la referencia se reemplazan por `ContentUnavailableView`, que es el patrón del sistema para estados vacíos y ya trae la tipografía, el ícono y el espaciado correctos.

## 6. Navegación

- `TabView` con las 4 secciones (Inicio, Transacciones, Reportes, Perfil), cada una con su `NavigationStack`.
- **Large titles** en la raíz de cada tab (`.navigationBarTitleDisplayMode(.large)`), inline en las pantallas de detalle.
- "Ver todo →" se implementa como `NavigationLink` estándar, con el chevron del sistema.

> **Delta importante — el botón flotante (+):** el círculo azul flotante superpuesto a la tab bar es un *Floating Action Button*, un patrón de Material Design (Android). No es Apple. Reemplazarlo por un botón en la barra de navegación:
> ```swift
> .toolbar {
>     ToolbarItem(placement: .topBarTrailing) {
>         Button("Añadir", systemImage: "plus") { showingAddSheet = true }
>     }
> }
> ```
> Lo mismo aplica al segundo botón flotante con gradiente (el de IA): va como acción en la toolbar o dentro de la hoja de "añadir", no flotando sobre el contenido.

## 7. Movimiento y feedback

- Animaciones **spring** del sistema: `.smooth`, `.snappy`, `.bouncy` (iOS 17). Nada de `linear` ni duraciones largas — por encima de ~0.4 s se siente lento.
- `matchedGeometryEffect` para la transición de tarjeta → detalle.
- **Haptics** con `.sensoryFeedback` (iOS 17): `.success` al guardar una transacción, `.warning` al superar un presupuesto, `.selection` en los pickers.
- Respetar **Reduce Motion**: sustituir movimiento por fundido cuando esté activo.

## 8. Gráficos (Swift Charts)

Se usa **Swift Charts** nativo, no una librería de terceros.

### Paleta categórica

Los colores del sistema de Apple son colores de *interfaz*, no de datos: varios quedan fuera de la banda de luminosidad segura o no alcanzan 3:1 de contraste sobre la superficie. La paleta de abajo mantiene las familias de color de Apple, pero con pasos ajustados y **verificada** (banda de luminosidad, croma mínimo, separación para daltonismo protan/deutan, contraste sobre superficie).

Se asignan **en orden fijo, nunca cíclicamente**. La categoría 9 en adelante se agrupa en "Otros".

| Slot | Familia | Claro | Oscuro |
|---|---|---|---|
| 1 | Azul | `#0A6FD8` | `#0A84FF` |
| 2 | Ámbar | `#C87400` | `#CE7B00` |
| 3 | Teal | `#0C8EA5` | `#1E9EB8` |
| 4 | Rosa | `#E52B50` | `#FF375F` |
| 5 | Índigo | `#5856D6` | `#5E5CE6` |
| 6 | Verde | `#2A9D4E` | `#22A54B` |
| 7 | Púrpura | `#AF52DE` | `#BF5AF2` |
| 8 | Bronce | `#A85D1F` | `#B0662A` |

Superficie de referencia usada en la validación: blanco en claro, `#1C1C1E` (`secondarySystemBackground`) en oscuro. El modo oscuro **no** es un volteo automático del claro: son pasos elegidos y validados aparte.

### Reglas de construcción

- **Un solo eje.** Nunca dos escalas Y en el mismo gráfico. Dos medidas de escala distinta → dos gráficos.
- **El color sigue a la categoría, no a su posición.** Si el usuario filtra y quedan menos categorías, las que sobreviven conservan su color.
- Marcas finas; extremos de barra redondeados 4 pt anclados a la línea base; 2 pt de separación entre segmentos contiguos de una barra apilada o una dona.
- **Leyenda siempre presente con 2 o más series**; con 4 o menos, además etiqueta directa. Una sola serie no lleva leyenda — el título la nombra.
- Nunca un número sobre cada punto: etiquetas directas selectivas (máximos, extremos, valor actual).
- **El texto nunca lleva el color de la serie** — valores y etiquetas van en `.label` / `.secondaryLabel`; el color lo carga la marca al lado.
- Ejes y cuadrícula recesivos (`.tertiaryLabel`, líneas de 0.5 pt).

### Colores de estado (reservados)

No se usan nunca como "serie 4". Siempre acompañados de ícono + texto, nunca color solo.

| Estado | Claro | Oscuro | Uso |
|---|---|---|---|
| Positivo / ingreso | `#1E7F35` | `#30D158` | Ingresos, meta cumplida |
| Advertencia | `#B25000` | `#FF9F0A` | Presupuesto al 80 % |
| Crítico / gasto | `#D70015` | `#FF453A` | Presupuesto excedido, saldo negativo |

Estos valores están verificados para **texto** (≥ 4.5:1 sobre su fondo). Los `systemGreen` y `systemOrange` por defecto de Apple **no** pasan como texto en modo claro (2.22:1 y 2.20:1) — por eso los pasos de arriba son más oscuros en claro.

> Un monto negativo no se distingue solo por ser rojo: siempre lleva el signo `−` y el formato de moneda. El color es refuerzo, no el único canal.

## 9. Accesibilidad

- Dynamic Type funcional hasta AX5.
- Objetivos táctiles mínimo **44 × 44 pt**.
- Etiquetas de VoiceOver en todo ícono sin texto; los montos se leen como moneda, no como dígitos sueltos.
- Soporte de **Reduce Motion** y **Reduce Transparency** (sustituir materiales por color sólido).
- Ninguna información se transmite solo por color (ver nota de montos arriba).
- Vista de tabla / lista disponible como alternativa a cada gráfico.

## 10. Formato de datos

- Montos: `valor.formatted(.currency(code: "COP"))` con locale `es_CO`. Nunca concatenar `"$" + string`.
- Fechas: formato relativo cuando aplique ("Hoy", "Ayer") y `.formatted(.dateTime)` para el resto.
- Los montos se guardan como enteros en la unidad menor (ver [04-modelo-datos.md](04-modelo-datos.md)) y solo se formatean en la capa de presentación.

## 11. Resumen de cambios respecto a las capturas de referencia

| En la referencia | Patrón Apple |
|---|---|
| Botón flotante (+) sobre la tab bar | Botón `plus` en la toolbar de navegación |
| Segundo botón flotante de IA con gradiente | Acción en la toolbar o dentro de la hoja de añadir |
| Emojis como íconos de categoría | SF Symbols sobre círculo de color |
| Cajas punteadas de estado vacío | `ContentUnavailableView` |
| Chips/pills custom para filtros | `Picker` segmentado y `Menu` nativos |
| Títulos pequeños fijos en el encabezado | Large titles de `NavigationStack` |
| Colores de UI usados como colores de gráfico | Paleta categórica validada (sección 8) |
| Tarjetas con sombra y radio circular | Superficies del sistema con radio continuo |
