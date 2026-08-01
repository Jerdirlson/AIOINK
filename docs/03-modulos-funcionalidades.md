# 03 · Módulos y funcionalidades

Desglose por pantalla, basado en las capturas de referencia (2026-08-01). Cada bloque indica si es MVP o fase posterior — ver [08-roadmap.md](08-roadmap.md).

## Navegación principal

Tab bar inferior de 4 secciones: **Inicio · Transacciones · Reportes · Perfil**, más un botón flotante central (+) para registrar una transacción desde cualquier pantalla.

## 1. Inicio (Dashboard)

**MVP.**

- Encabezado: saludo con nombre del usuario, avatar, badge de plan, accesos a notificaciones y edición rápida.
- Selector de periodo (mes) + filtro general.
- **Mis cuentas:** tarjetas horizontales por cuenta (nombre, moneda, saldo). Distingue visualmente cuentas normales de cuentas de ahorro/"colchón".
- **Saldo + Ahorros** (acumulado histórico) y **Gastos** (balance del periodo) como tarjetas KPI.
- **Presupuestos:** preview de los presupuestos activos; estado vacío con CTA "Añade tu primer presupuesto".
- **Últimas transacciones:** las 5 más recientes (ícono de categoría, comercio/descripción, categoría, monto), con link a "Ver todo".
- **Ahorros y metas:** preview; estado vacío con CTA.
- **Deudas:** preview; estado vacío con CTA.
- Botón flotante secundario de IA (acceso rápido a captura asistida, ver módulo 5).

## 2. Transacciones

**MVP el listado y filtros; "Futuras" y multi-moneda quedan para después.**

- Encabezado con rango de fechas activo, selector de moneda, balance total del periodo (formato compacto, ej. "$9,59 M").
- Controles: selector de mes, toggle "Futuras" (transacciones programadas/recurrentes), botón de filtros avanzados.
- Tabs de agrupación: **Categorías · Cuentas · Ahorros** — cada uno muestra un carrusel de tarjetas con el total gastado por ítem del grupo en el periodo.
- Listado completo "Todas las transacciones", agrupado por fecha (Hoy, fecha explícita para días anteriores), con buscador. Cada fila: ícono de categoría, categoría + descripción, monto (rojo si es gasto), cuenta de origen.

## 3. Reportes

**MVP: saldo/ingresos/gastos mensuales + gráfico de barras por categoría. La dona y la edición de widgets quedan para después.**

- Tabs: **Reportería** (visual) y **Exportación** (CSV/PDF — fase posterior).
- Selector de mes + filtro.
- KPIs: saldo mensual, ingresos mensuales, gastos mensuales (ingresos/gastos son editables manualmente, útil cuando no hay agregación bancaria completa).
- Gráfico de barras "Top categorías" por rango de fechas.
- Gráfico de dona "Gastos por semana/periodo" con leyenda de porcentaje por categoría.
- Los widgets tienen ícono de edición — sugiere que el dashboard de reportes es personalizable (reordenar/quitar tarjetas). Se deja como fase posterior.

## 4. Perfil

**MVP: datos de cuenta, apariencia, cerrar sesión. El resto (plan Pro, automatizaciones, soporte) se activa por fases según se construyan esos módulos.**

- Idioma (selector ES/otros — fase posterior, MVP fijo en español).
- Avatar, nombre, correo.
- **Tu plan:** estado del plan (Pro/Free) y gestión de suscripción — fase posterior (ver 01-vision-alcance, fuera del MVP).
- Invitar amigos / calificar la app — fase posterior.
- **Alertas:** notificaciones push (ej. aviso de presupuesto excedido).
- **Automatización en iOS** (sección clave, ver módulo 5 para detalle de cada canal):
  - SMS Bancario Automático — estado activo/inactivo.
  - Apple Pay Automático — estado del Atajo (MVP).
  - WhatsApp Conectado — número de bot vinculado.
- **Configuración:**
  - Gestión rápida de categorías, cuentas y presupuestos.
  - Categorías especiales (saldo inicial, transferencias) — no editables/borrables por el usuario.
  - Cambiar moneda / cambiar país — fijos en COP/Colombia en el MVP.
  - Apariencia (claro/oscuro) — MVP.
- **Tus datos:** gestión de almacenamiento y de la conexión de WhatsApp (exportar/borrar datos — relevante para cumplimiento, ver [07-seguridad-cumplimiento.md](07-seguridad-cumplimiento.md)).
- **Cuenta:** cerrar sesión, eliminar cuenta (borrado real de datos).
- Soporte y comunidad — fase posterior.

## 5. Captura de transacciones (multicanal)

Ver detalle técnico en [06-captura-multicanal.md](06-captura-multicanal.md). Desde el botón (+) se despliega un selector "¿Cómo quieres registrar hoy?":

| Método | Descripción | Fase |
|---|---|---|
| Manual | Formulario: cuenta, categoría, monto, fecha, nota | MVP |
| Apple Pay Automático | Atajo de iOS detecta pago NFC y hace POST al backend | MVP |
| Mic AI | Dictado de voz → transcripción → IA extrae monto/comercio/categoría | Posterior |
| Scan AI | Foto de recibo/factura → OCR → IA extrae los mismos campos | Posterior |
| Notas AI | Texto libre ("almorcé por 25 mil con Juan") → IA extrae la transacción | Posterior |
| WhatsApp Bot | El usuario le escribe al bot y este registra la transacción | Posterior |
| SMS Bancario Automático | Parseo de SMS de notificación bancaria | Posterior |

## 6. Módulos de datos sin pantalla propia en el MVP

- **Categorías:** catálogo con ícono/emoji, incluye categorías especiales del sistema (saldo inicial, transferencias) que no se pueden borrar.
- **Cuentas:** tipo (efectivo, débito, crédito, ahorro), moneda, saldo.
- **Presupuestos:** por categoría y periodo, con alerta al superarse — placeholder en MVP, funcional en fase 2.
- **Ahorros y metas:** meta de monto + fecha objetivo — placeholder en MVP.
- **Deudas:** seguimiento de deuda propia o de terceros — placeholder en MVP.
