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
- `initialBalance` — se registra como transacción de la categoría especial "Saldo inicial"
- `isArchived`

### Category (categoría)
- `id`, `userId` (null si es categoría del sistema)
- `name`, `icon` (emoji o asset)
- `kind` (`expense` | `income` | `system`)
- `isSystem` (true para "Saldo inicial" y "Transferencia" — no editable/borrable)

### Transaction (transacción)
- `id`, `userId`, `accountId`, `categoryId`
- `amount` (entero en centavos o unidad menor, para evitar errores de coma flotante), `currency`
- `type` (`expense` | `income` | `transfer`)
- `description`, `note`
- `occurredAt` (fecha del gasto), `createdAt`
- `source` (`manual` | `apple_pay_shortcut` | `sms` | `whatsapp` | `scan_ai` | `mic_ai` | `notes_ai` | `belvo`)
- `externalId` (nullable — id en Belvo u otro origen externo, para deduplicar)
- `transferGroupId` (nullable — enlaza las dos transacciones de una transferencia entre cuentas propias)

### Budget (presupuesto) — fase 2
- `id`, `userId`, `categoryId`
- `amount`, `period` (`monthly`)
- `startDate`

### SavingGoal (meta de ahorro) — fase 2
- `id`, `userId`, `accountId` (opcional, cuenta asociada)
- `name`, `targetAmount`, `currentAmount`, `targetDate`

### Debt (deuda) — fase 2
- `id`, `userId`
- `name`, `counterparty` (a quién se debe o quién debe), `direction` (`owed_by_me` | `owed_to_me`)
- `totalAmount`, `remainingAmount`, `dueDate`

## Relaciones clave

```
User 1─N Account
User 1─N Category (+ categorías del sistema compartidas, userId null)
User 1─N Transaction
Account 1─N Transaction
Category 1─N Transaction
User 1─N Budget ─N:1─ Category
User 1─N SavingGoal ─N:1─ Account
User 1─N Debt
```

## Decisiones de modelado

- **Montos en enteros** (menor unidad monetaria) para evitar errores de redondeo — coherente con backend en TypeScript.
- **`source` en Transaction** desde el MVP, aunque solo se usen `manual` y `apple_pay_shortcut` al inicio — evita una migración disruptiva cuando se agreguen los demás canales.
- **Transferencias** se modelan como dos `Transaction` (una por cuenta) unidas por `transferGroupId`, en vez de un tipo de entidad aparte — simplifica reportes porque todo sigue siendo una transacción.
- **Deduplicación con Belvo:** cuando se active la integración, cada movimiento importado guarda su `externalId` de Belvo; el backend debe verificar que no exista ya un `externalId` igual antes de insertar (evita duplicar lo que el usuario ya registró manualmente o vía Apple Pay).
