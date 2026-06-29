# 03 · Módulos

### 1. Identidad y autenticación
- Registro/login con **Sign in with Apple**, sesión por JWT + refresh tokens.
- Bloqueo biométrico (Face ID) al abrir la app; tokens en Keychain de iOS.

### 2. Conexión bancaria (Belvo Link)
- **Belvo Connect Widget** embebido en `WKWebView` (el backend genera el `access_token` temporal).
- Soporte **multi-banco / multi-cuenta** por usuario.
- Gestión de *links*: estado (válido / requiere re-login / vencido), reconexión, eliminación.
- `access_mode = recurrent` para sincronización continua.

### 3. Ingesta y sincronización
- **Pull histórico** inicial al conectar (cuentas, balances, transacciones).
- **Webhooks de Belvo** (`historical_update`, nuevas transacciones) → cola → ingestión.
- **Deduplicación** por `belvo_transaction_id` (idempotente).
- Normalización al modelo interno común.

### 4. Transacciones
- Modelo unificado: monto, moneda (COP), fecha, comercio, cuenta, categoría, tipo (gasto/ingreso/transferencia).
- Detalle, búsqueda, filtros, split, notas, adjuntos (recibos).

### 5. Categorización automática (capa híbrida)
- **Base:** categoría que ya entrega Belvo (enrichment).
- **Reglas del usuario:** "comercio X → categoría Y" (override persistente).
- **Aprendizaje por feedback:** al recategorizar, se crea/ajusta una regla.
- **Fallback opcional con LLM (Claude):** comercios ambiguos/no resueltos. Modelo sugerido `claude-haiku-4-5`.
- Detección de **gastos recurrentes** e **ingresos** vía endpoints de enrichment de Belvo.

### 6. Transacciones manuales / efectivo
- Registro manual de gastos que el banco no ve, con la misma categorización.

### 7. Presupuestos y metas
- Presupuestos por categoría/mes; metas de ahorro con progreso y proyección.

### 8. Insights / Dashboard
- Flujo de caja (ingresos vs gastos), gasto por categoría, tendencias, suscripciones detectadas,
  balance consolidado multi-banco. Gráficas con Swift `Charts`.

### 9. Notificaciones y alertas
- Push (APNs): nueva transacción, presupuesto excedido, cobro recurrente próximo, gasto inusual.

### 10. Ajustes, seguridad y privacidad
- Gestión de cuentas conectadas, exportar datos, borrar cuenta.
- Cumplimiento **Ley 1581 de 2012 (Habeas Data)** — ver [06](06-seguridad-cumplimiento.md).
