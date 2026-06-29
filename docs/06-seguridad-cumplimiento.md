# 06 · Seguridad y cumplimiento

La seguridad es crítica en una app financiera. Principios:

## Datos y secretos
- **Nunca** almacenar credenciales bancarias: las captura el widget de Belvo, no nuestra app/backend.
- Llaves secretas de Belvo **solo en el backend** (secret manager / variables de entorno), nunca en la app iOS.
- **No** almacenar números de tarjeta (PAN) → fuera del alcance pesado de PCI-DSS.

## Cifrado
- **TLS** en todo el tránsito.
- **Cifrado en reposo** en PostgreSQL; cifrado a nivel de campo para datos sensibles (`merchant`, `description`, `notes`).
- Tokens de sesión en el **Keychain** de iOS; **Face ID** para abrir la app.

## Webhooks
- Validar la **firma** de los webhooks de Belvo antes de procesarlos.
- Ingestión idempotente (clave única por transacción) para evitar duplicados o replays.

## Cumplimiento — Colombia
- **Ley 1581 de 2012 (Habeas Data)**: consentimiento explícito, finalidad declarada, y derechos del
  titular (acceso, corrección, **exportar** y **borrar** sus datos).
- Política de tratamiento de datos publicada (la exige también Belvo para operar).
- Minimización: guardar solo los datos necesarios para el producto.

## Buenas prácticas adicionales
- Rotación de secretos y principio de mínimo privilegio en el backend.
- Logs sin datos sensibles en claro.
- Borrado en cascada al eliminar cuenta (links, cuentas, transacciones).
