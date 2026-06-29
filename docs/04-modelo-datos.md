# 04 · Modelo de datos (núcleo)

Esquema relacional inicial. Los nombres son orientativos; se afinarán al implementar las migraciones.

```
users            (id, apple_sub, email, created_at)
institutions     (id, belvo_institution_id, name, country, logo)
bank_links       (id, user_id, belvo_link_id, institution_id, status, access_mode, created_at)
accounts         (id, link_id, belvo_account_id, name, type, currency, balance, updated_at)
transactions     (id, account_id, belvo_tx_id UNIQUE, amount, currency, date,
                  merchant, description, category_id, type, is_manual, notes, created_at)
categories       (id, name_es, parent_id, icon, is_system)
category_rules   (id, user_id, match_type, match_value, category_id)   -- aprendizaje/override
budgets          (id, user_id, category_id, period, amount)
goals            (id, user_id, name, target_amount, current_amount, due_date)
recurring        (id, user_id, merchant, avg_amount, cadence, next_date)
notifications    (id, user_id, type, payload, read_at, created_at)
```

## Relaciones

- `users` 1—N `bank_links` 1—N `accounts` 1—N `transactions`.
- `transactions` N—1 `categories`.
- `category_rules` pertenecen al usuario y resuelven la categoría antes/después de Belvo.
- `budgets`, `goals`, `recurring`, `notifications` pertenecen al usuario.

## Notas de diseño

- **`transactions.belvo_tx_id` es UNIQUE** → garantiza idempotencia en la ingesta vía webhooks.
- `type` ∈ {`expense`, `income`, `transfer`}; las transferencias internas se excluyen de gasto neto.
- `is_manual = true` para efectivo/registro manual (sin `belvo_tx_id`).
- `currency` por defecto `COP` en el MVP.
- Campos sensibles candidatos a cifrado a nivel de campo: `merchant`, `description`, `notes`.
