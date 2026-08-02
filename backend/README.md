# Backend de IAOINK

API REST de la app de finanzas personales. NestJS + Prisma + PostgreSQL.

## Requisitos

- Node.js 20+ (probado en 24)
- Docker (para la base de datos local)

## Puesta en marcha

```bash
cd backend
npm install

# 1. Variables de entorno
cp .env.example .env
# Generar un JWT_SECRET propio:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 2. Base de datos
docker compose up -d

# 3. Migraciones + cliente de Prisma
npx prisma migrate dev

# 4. Arrancar
npm run start:dev
```

La API queda en `http://localhost:3000/api` y la documentación interactiva
(Swagger) en `http://localhost:3000/api/docs`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | Servidor con recarga en caliente |
| `npm run build` | Compila a `dist/` |
| `npm test` | Tests unitarios |
| `npm run test:e2e` | Tests de integración (necesitan Postgres arriba) |
| `npm run lint` | ESLint con autofix |
| `npx prisma studio` | Explorador visual de la base de datos |
| `npx prisma migrate dev` | Crea y aplica una migración |

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a Postgres |
| `JWT_SECRET` | Secreto de firma de los JWT (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | Vigencia del token (por defecto `7d`) |
| `PORT` | Puerto HTTP (por defecto `3000`) |
| `NODE_ENV` | `development` \| `test` \| `production` |

Se validan al arrancar con Zod (`src/config/env.validation.ts`): si falta o
está mal alguna, la app no levanta.

## Estructura

```
src/
  auth/          Registro, login, JWT, guard global
  accounts/      Cuentas y cálculo de saldo
  categories/    Categorías, incluidas las de sistema
  transactions/  Transacciones y transferencias
  common/        Decoradores, filtros e interceptores compartidos
  config/        Validación de variables de entorno
  prisma/        Cliente de Prisma como servicio inyectable
  health/        Endpoint de salud
prisma/
  schema.prisma  Modelo de datos
  migrations/    Historial de migraciones
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Salud de la API y la base de datos (público) |
| `POST` | `/api/auth/register` | Crea cuenta + categorías por defecto (público) |
| `POST` | `/api/auth/login` | Devuelve un JWT (público) |
| `GET/PATCH` | `/api/users/me` | Ver y editar el perfil |
| `DELETE` | `/api/users/me` | Elimina la cuenta y todos sus datos (Ley 1581) |
| `GET/POST/PATCH/DELETE` | `/api/categories` | CRUD de categorías |
| `GET/POST/PATCH/DELETE` | `/api/accounts` | CRUD de cuentas, con saldo calculado |
| `GET/POST/PATCH/DELETE` | `/api/transactions` | CRUD de transacciones, con filtros |
| `POST` | `/api/transactions/transfer` | Transferencia entre cuentas propias |
| `GET` | `/api/reports/summary` | Ingresos, gastos y saldo del periodo |
| `GET` | `/api/reports/by-category` | Gasto por categoría, de mayor a menor |
| `GET` | `/api/reports/monthly` | Serie mensual de ingresos y gastos |
| `GET/POST/DELETE` | `/api/shortcut-tokens` | Tokens del Atajo de iOS |
| `POST` | `/api/integrations/apple-pay` | Entrada del Atajo (token propio, no JWT) |

## Decisiones que conviene conocer

**Los montos son enteros con signo, en centavos.** Nunca decimales — evita
errores de coma flotante con dinero. Negativo = sale plata de la cuenta,
positivo = entra. Son `BIGINT` porque en COP los centavos superan el rango de
un entero de 32 bits.

**El saldo no se guarda, se calcula** como `SUM(transactions.amount)`. No hay
campo `balance` en la tabla de cuentas, así que no puede quedar desincronizado
al editar o borrar una transacción. El saldo de apertura de una cuenta se
materializa como una transacción de la categoría de sistema "Saldo inicial".

**Una transferencia son dos transacciones** (−X en origen, +X en destino)
enlazadas por `transferGroupId`, escritas en la misma transacción de base de
datos. Borrar una pata borra ambas: dejar una sola descuadraría los saldos.

**Seguro por defecto:** el `JwtAuthGuard` es global, así que todo endpoint
exige token salvo que se marque explícitamente con `@Public()`. Olvidar el
guard en un controlador nuevo no abre un hueco.

**Las categorías de sistema son por usuario**, no globales, para que toda
consulta filtre por `userId` sin casos especiales.

**Los reportes excluyen las categorías del sistema.** El "Saldo inicial" no es
un ingreso (es dinero que ya existía) y una transferencia entre cuentas propias
no es ni gasto ni ingreso. Contarlos inflaría los totales y descuadraría los
porcentajes del gráfico.

**El JWT se valida contra la base en cada petición.** Un token es válido
criptográficamente aunque la cuenta se haya eliminado; con vigencia de 7 días
eso permitiría operar una semana después de un borrado, incompatible con el
derecho de cancelación. Cuesta una búsqueda por clave primaria.

**El token del Atajo se guarda hasheado** (SHA-256) y solo se muestra en claro
al crearlo, como una API key. Es independiente del JWT: se revoca sin cerrar la
sesión del usuario. El endpoint de Apple Pay es idempotente por `externalId`,
para que un reintento del Atajo no duplique el gasto.

**Serialización de BigInt:** `JSON.stringify` no sabe serializar `BigInt`, así
que un interceptor global los convierte a `number` al responder, y lanza si el
valor excediera el rango exacto de un `Number` en vez de devolver un número
corrupto en silencio.

## Notas sobre Prisma 7

Desde la versión 7, la URL de conexión no va en `schema.prisma` sino en
`prisma.config.ts`, y el cliente en runtime se conecta a través de un *driver
adapter* (`@prisma/adapter-pg`). Ver `src/prisma/prisma.service.ts`.
