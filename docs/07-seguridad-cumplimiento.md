# 07 · Seguridad y cumplimiento

## Naturaleza de los datos

IAOINK maneja datos financieros personales (montos, comercios, hábitos de consumo) y, desde la fase Belvo, credenciales de acceso bancario indirectas (tokens de Belvo, nunca las credenciales del banco en sí). Se tratan como datos sensibles desde el día uno del MVP, no solo cuando se agregue Belvo.

## Colombia — Ley 1581 de 2012 (Habeas Data)

- **Autorización previa:** el usuario debe aceptar explícitamente una política de tratamiento de datos al registrarse, indicando qué se recolecta (transacciones, cuentas, y si aplica, conexión bancaria vía Belvo) y para qué.
- **Finalidad limitada:** los datos solo se usan para el funcionamiento de la app (registro y análisis de gastos propios del usuario) — no se venden ni se comparten con terceros para fines distintos.
- **Derechos ARCO** (acceso, rectificación, cancelación, oposición): el usuario debe poder pedir sus datos o eliminarlos. En la app esto se traduce en "Gestionar mis datos" y "Eliminar mi cuenta" (ver [03-modulos-funcionalidades.md](03-modulos-funcionalidades.md)) — eliminar cuenta debe borrar realmente los datos, no solo desactivar el login.
- **Registro Nacional de Bases de Datos (RNBD):** evaluar si aplica según volumen de usuarios cuando el producto salga de fase de desarrollo — no bloquea el MVP con pocos usuarios de prueba, pero hay que revisarlo antes de un lanzamiento público.

## Seguridad técnica (MVP)

- HTTPS obligatorio en toda comunicación app ↔ backend.
- Contraseñas con hash (bcrypt/argon2), nunca en texto plano.
- JWT de sesión con expiración razonable; el token del Atajo de Apple Pay (ver [06-captura-multicanal.md](06-captura-multicanal.md)) es un token aparte, de propósito único, revocable independientemente del login normal.
- Tokens de Keychain en el cliente iOS, nunca en `UserDefaults`.
- Variables sensibles (secrets de Belvo, JWT secret, credenciales de DB) solo en `.env`, nunca commiteadas — ver `.gitignore`.

## Seguridad al integrar Belvo

- El backend nunca ve ni almacena credenciales bancarias del usuario — las maneja directamente Belvo vía su widget de conexión.
- Solo se persiste el identificador de conexión (`link_id`) y tokens de acceso a la API de Belvo, cifrados en reposo.
- Revocar el acceso desde "Gestionar mis datos" debe invalidar también la conexión del lado de Belvo, no solo borrarla localmente.

## Backups y disponibilidad

- Backups periódicos de PostgreSQL (frecuencia según lo que ofrezca el proveedor de hosting elegido — ver [02-arquitectura-stack.md](02-arquitectura-stack.md)).
- No es un sistema crítico en tiempo real (a diferencia de un banco); una indisponibilidad breve del backend es aceptable, pérdida de datos no lo es.
