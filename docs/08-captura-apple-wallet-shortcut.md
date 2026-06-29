# 08 · Captura de gastos con Apple Wallet (Atajo / Shortcut)

Fuente **principal** de auto-registro para el MVP. Nativa de iOS, gratis, sin Belvo.
Ver decisión en [ADR-0002](decisiones/ADR-0002-no-apple-wallet.md).

## Cómo funciona

```
Pagas con Apple Pay (NFC)
        │
        ▼
Automatización "Transacción" (Atajos, iOS 17+)  ── se dispara sola
        │   entrega: tarjeta · comercio · monto
        ▼
Atajo: limpia el monto y arma un JSON
        │
        ▼
POST https://<backend>/api/ingest/shortcut   (header: Authorization: Bearer <token>)
        │
        ▼
Backend: valida token → auto-categoriza → guarda transacción
        │
        ▼
La app iOS muestra el gasto ya categorizado
```

## Datos que entrega la automatización

| Campo | Origen en el atajo | Notas |
|-------|--------------------|-------|
| Comercio | `Merchant` de la transacción | A veces genérico/abreviado |
| Monto | `Amount` (texto) | Hay que quitar símbolo de moneda y separadores |
| Tarjeta | `Card / Pass` | Nombre de la tarjeta/pase usado |
| Fecha | Fecha actual del atajo | La automatización corre al instante del pago |

## Contrato del endpoint de ingesta

`POST /api/ingest/shortcut`

```jsonc
// Request
{
  "merchant": "EXITO POBLADO",
  "amount": 53400,          // ya numérico (el atajo limpia el texto)
  "currency": "COP",
  "card": "Visa Bancolombia",
  "occurred_at": "2026-06-29T15:04:00-05:00",
  "source": "apple_wallet_shortcut"
}
// Headers:  Authorization: Bearer <token-del-usuario>

// Response 201
{ "id": 123, "category": "mercado", "auto_categorized": true }
```

- **Autenticación:** un token por usuario, generado en la app y pegado una sola vez dentro del atajo.
- **Idempotencia:** clave por `(user, merchant, amount, minuto)` para evitar duplicados si el atajo
  reintenta.
- **Auto-categorización:** se reutiliza el mismo motor de reglas del backend (`categorize`).

## Configuración que hará el usuario (una vez)

1. App **Atajos** → pestaña **Automatización** → **+** → **Crear automatización personal**.
2. Elegir **Transacción** → seleccionar las **tarjetas** a monitorear → no filtrar comercios.
3. Acción: **Obtener contenido de URL** (POST) hacia `/api/ingest/shortcut` con el JSON y el token.
4. **Ejecutar inmediatamente** (sin preguntar) y desactivar "Preguntar antes de ejecutar".

> En una fase posterior, la app puede **instalar el atajo preconfigurado** (vía enlace iCloud del
> atajo) para que el usuario no lo arme a mano.

## Límites (importante)

- Solo **Apple Pay por NFC** (tap). No capta compras online por navegador ni tarjeta física sin Apple Pay.
- Efectivo y compras online → registro **manual** o, más adelante, **Belvo** (cobertura total).

## Referencias

- [Apple — Transaction triggers in Shortcuts](https://support.apple.com/guide/shortcuts/transaction-trigger-apd65c67538a/ios)
- [Matthew Cassinelli — Transaction automation (iOS 17)](https://matthewcassinelli.com/shortcuts-automations-ios-ipados-transaction-display-stage-manager/)
