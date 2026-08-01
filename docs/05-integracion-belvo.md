# 05 · Integración con Belvo

Fase posterior al MVP. Ver [ADR-0001](decisiones/ADR-0001-belvo-como-agregador.md) para el razonamiento de por qué Belvo sobre otras alternativas.

## Qué resuelve

El Atajo de Apple Pay (MVP) solo captura pagos NFC. Belvo agrega, vía credenciales bancarias del usuario (Open Finance / screen scraping según el banco), lo que ese Atajo no ve:
- Compras con tarjeta física o en línea.
- Saldos reales de cuentas (no solo lo que la app calculó).
- Movimientos históricos al momento de conectar la cuenta.
- Categorización automática que provee Belvo (se usa como sugerencia inicial, no reemplaza el modelo propio de categorías).

## Modelo de trabajo

1. Sandbox de Belvo (gratis) para todo el desarrollo e integración inicial.
2. Producción requiere aprobación de Belvo + plan de pago — se solicita cuando el MVP esté validado con usuarios reales, no antes.
3. Flujo típico: el usuario conecta su banco desde la app (Belvo Widget o flujo propio) → backend recibe `link_id` → backend sincroniza cuentas y transacciones vía API de Belvo → se insertan como `Transaction` con `source = "belvo"` y `externalId` del movimiento.

## Consideraciones

- **Deduplicación:** un gasto de Apple Pay ya registrado por el Atajo puede volver a aparecer al sincronizar con Belvo unos días después. Se resuelve por `externalId` (ver [04-modelo-datos.md](04-modelo-datos.md)) y, si Belvo no da un id estable comparable, por heurística de monto+fecha+comercio con confirmación del usuario en caso de duda.
- **Frecuencia de sync:** polling periódico (ej. cada pocas horas) o webhooks de Belvo si están disponibles para el plan contratado.
- **Bancos soportados en Colombia:** validar cobertura real de Belvo antes de comprometer bancos específicos en el marketing del producto.
- **Costo:** Belvo cobra por conexión/uso en producción — impacta directamente el modelo de precios del plan Pro.

## Seguridad

Las credenciales bancarias del usuario nunca las ve ni las almacena el backend de IAOINK — el flujo de conexión (Belvo Widget) las maneja directamente Belvo. El backend solo guarda el `link_id`/token de acceso a la API de Belvo para ese usuario. Ver [07-seguridad-cumplimiento.md](07-seguridad-cumplimiento.md).
