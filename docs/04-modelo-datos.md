# 04 · Modelo de datos

Modelo conceptual para el MVP y las fases inmediatas siguientes. Se implementa como schema de Prisma sobre PostgreSQL (`backend/prisma/schema.prisma`).

## Entidades principales

### User
- `id`, `email`, `passwordHash` (o proveedor OAuth), `name`, `avatarUrl`
- `currency` (default `COP`), `country` (default `CO`), `locale` (default `es`)
- `plan` (`free` | `pro`) — fase posterior
- `createdAt`, `updatedAt`

### Account (cuenta)
- `id`, `userId`
- `name` (ej. "Principal", "Colchón")
- `type` (`cash` | `debit` | `credit` | `savings`)
- `currency`
- `isArchived`
- **No tiene campo de saldo.** El saldo es siempre `SUM(transactions.amount)`. El saldo de apertura se materializa como una transacción de la categoría de sistema "Saldo inicial", para que haya una sola fuente de verdad y no dos valores que puedan divergir.

### Category (categoría)
- `id`, `userId` (obligatorio, también en las de sistema)
- `name`, `icon` (nombre de un SF Symbol, ver [09-diseno-sistema.md](09-diseno-sistema.md) §4)
- `kind` (`expense` | `income` | `system`)
- `isSystem` (true para "Saldo inicial" y "Transferencia" — no editable/borrable)
- `colorSlot` (1..8, slot de la paleta de gráficos; null = "Otros")

Las categorías de sistema son **por usuario**, no globales: se crean al registrarse. Así toda consulta filtra por `userId` sin casos especiales (`userId = X OR userId IS NULL`) y borrar la cuenta las limpia en cascada.

### Transaction (transacción)
- `id`, `userId`, `accountId`, `categoryId`
- `amount` — entero en la unidad menor de la moneda (centavos) **y con signo**: negativo = sale dinero de la cuenta, positivo = entra. Se guarda con signo en vez de "positivo + tipo" para que el saldo sea una suma directa y una transferencia sea simplemente un par −X / +X, sin lógica condicional en cada consulta. `type` queda como etiqueta semántica y el backend valida que el signo concuerde con ella.
- `currency`
- `type` (`expense` | `income` | `transfer`)
- `description`, `note`
- `occurredAt` (fecha del gasto), `createdAt`
- `source` (`manual` | `apple_pay_shortcut` | `sms` | `whatsapp` | `scan_ai` | `mic_ai` | `notes_ai` | `belvo`)
- `externalId` (nullable — id en Belvo u otro origen externo, para deduplicar)
- `transferGroupId` (nullable — enlaza las dos transacciones de una transferencia entre cuentas propias)

### Budget (presupuesto)
- `id`, `userId`, `categoryId`
- `amount` (límite en centavos, positivo), `period` (`MONTHLY`)
- Uno por categoría (`@@unique([userId, categoryId])`): dos límites simultáneos sobre la misma categoría no tendrían un significado claro.
- **No guarda cuánto se lleva gastado** — se calcula sumando las transacciones de la categoría en el periodo, igual que el saldo de una cuenta. Un contador almacenado se desincronizaría al editar o borrar una transacción.
- Solo aplica a categorías de gasto: presupuestar un ingreso o una categoría de sistema no significa nada.

### SavingGoal (meta de ahorro)
- `id`, `userId`
- `name`, `targetAmount`, `currentAmount`, `targetDate`
- `currentAmount` **sí** se almacena, y no contradice la regla anterior: no se deriva de ninguna transacción, es un dato que el usuario afirma mediante aportes. Vincular la meta al saldo de una cuenta queda pendiente.

### Debt (deuda)
- `id`, `userId`
- `name`, `counterparty` (a quién se debe o quién debe), `direction` (`OWED_BY_ME` | `OWED_TO_ME`)
- `totalAmount`, `remainingAmount`, `dueDate`
- `remainingAmount` se almacena por el mismo motivo que `currentAmount`: lo asienta el usuario con cada abono. Se valida que nunca supere el total ni baje de 0.

## Relaciones clave

```
User 1─N Account
User 1─N Category (incluidas las de sistema, que también son por usuario)
User 1─N Transaction
Account 1─N Transaction
Category 1─N Transaction
User 1─N Budget ─N:1─ Category
User 1─N SavingGoal ─N:1─ Account
User 1─N Debt
```

## Decisiones de modelado

- **Montos en enteros con signo** (menor unidad monetaria) para evitar errores de redondeo y hacer que el saldo sea `SUM(amount)`. En Postgres son `BIGINT`: en COP un monto en centavos supera el rango de un entero de 32 bits.
- **El saldo no se almacena, se calcula.** No hay campo `balance` en `Account` — evita el clásico bug de saldo desincronizado tras editar o borrar una transacción.
- **`source` en Transaction** desde el MVP, aunque solo se usen `manual` y `apple_pay_shortcut` al inicio — evita una migración disruptiva cuando se agreguen los demás canales.
- **Transferencias** se modelan como dos `Transaction` (una por cuenta) unidas por `transferGroupId`, en vez de un tipo de entidad aparte — simplifica reportes porque todo sigue siendo una transacción.
- **Deduplicación con Belvo:** cuando se active la integración, cada movimiento importado guarda su `externalId` de Belvo; el backend debe verificar que no exista ya un `externalId` igual antes de insertar (evita duplicar lo que el usuario ya registró manualmente o vía Apple Pay).
