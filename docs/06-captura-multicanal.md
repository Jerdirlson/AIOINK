# 06 · Captura multicanal de transacciones

Detalle técnico de cada canal de captura mencionado en [03-modulos-funcionalidades.md](03-modulos-funcionalidades.md), ordenados por fase.

## MVP

### Apple Pay Automático (Atajo de iOS)

- Ver [ADR-0002](decisiones/ADR-0002-no-apple-wallet-directo.md): no existe API pública para leer Apple Wallet directamente: la vía real es la automatización **"Transacción"** de la app Atajos (iOS 17+), que se dispara después de un pago con Apple Pay.
- El Atajo arma un JSON con comercio, monto y tarjeta usada, y hace `POST` a un endpoint del backend (`/transactions/apple-pay-webhook` o similar) autenticado con un token de larga duración específico del Atajo (no la sesión normal del usuario, para que el Atajo siga funcionando sin reautenticar).
- Limitación conocida: solo cubre pagos **NFC** (Apple Pay físico/contactless). No cubre compras en línea con la tarjeta guardada en Safari/apps, ni tarjeta física sin Apple Pay.
- La app debe guardar y mostrar el estado del Atajo (activo/inactivo) en Perfil → Automatización, como en la referencia.

### Manual

Formulario estándar. Siempre disponible, es el fallback de todos los demás canales cuando fallan o el usuario prefiere precisión.

## Fase posterior

### SMS Bancario Automático

- La mayoría de bancos colombianos notifican transacciones por SMS con formato semi-estructurado (monto, comercio, últimos dígitos de tarjeta).
- iOS no permite leer SMS de otras apps de forma general por privacidad; la vía viable es de nuevo una automatización de Atajos disparada por notificación, o que el usuario reenvíe/comparta el SMS a la app (share sheet). Definir el mecanismo exacto es un spike técnico antes de construir este canal — no asumir que hay acceso directo al inbox de SMS.
- El parseo del texto (regex + reglas por banco, con fallback a IA) se hace en el backend, no en el cliente, para poder mejorar las reglas sin publicar una nueva versión de la app.

### WhatsApp Bot

- Basado en WhatsApp Business API (ej. vía Twilio o Meta Cloud API directo).
- El usuario vincula su número desde Perfil → Automatización → WhatsApp Conectado.
- Mensajes de texto libre o foto de recibo enviados al bot se procesan igual que "Notas AI" / "Scan AI", pero el canal de entrada es WhatsApp en vez de la app.
- Requiere aprobación de número de negocio de WhatsApp — tiempos de aprobación externos a planificar con margen.

### Scan AI (OCR de recibos)

- Usuario toma foto de un recibo/factura → sube imagen → backend la pasa a un servicio de OCR (proveedor por definir) → el texto extraído se pasa a un LLM con un prompt estructurado para devolver `{comercio, monto, fecha, categoría sugerida}`.
- El usuario siempre confirma/edita antes de guardar — nunca se inserta una transacción sin confirmación cuando viene de un canal con margen de error alto.

### Mic AI (dictado por voz)

- Grabación de voz → speech-to-text (on-device con `Speech` framework de iOS cuando sea posible, para minimizar costo y latencia; fallback a servicio en la nube) → mismo pipeline de extracción por LLM que Scan AI → confirmación del usuario.

### Notas AI (texto libre)

- El usuario escribe una frase natural ("almorcé por 25 mil con Juan") → LLM extrae `{monto, categoría sugerida, descripción}` → confirmación del usuario.
- Comparte el mismo endpoint/prompt de extracción que Mic AI y Scan AI (la única diferencia entre los tres es cómo se obtuvo el texto de entrada) — construir un único servicio de "extracción de transacción desde texto" en el backend, no tres.

## Principio transversal

Todo canal que involucre IA o parseo con margen de error (SMS, WhatsApp, Scan/Mic/Notas AI) **siempre termina en una pantalla de confirmación editable** antes de persistir la transacción. Solo Apple Pay (fuente determinística) y Belvo (fuente del propio banco) se insertan sin confirmación previa.
