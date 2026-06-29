# tools/ — Pruebas de integración

Probar la conexión con Belvo. Hay dos versiones equivalentes:
- **`test_belvo.mjs`** (Node 18+) — **recomendada**, ya tienes Node instalado.
- **`test_belvo.py`** (Python 3) — si prefieres Python.

### Pasos

1. **Crea una cuenta sandbox** en https://dashboard.belvo.com y genera tus llaves
   (`Secret ID` y `Secret Password`).
2. Córrelo (PowerShell, desde la raíz del proyecto):

   ```powershell
   $env:BELVO_SECRET_ID="tu_secret_id"
   $env:BELVO_SECRET_PASSWORD="tu_secret_password"
   node tools/test_belvo.mjs        # o:  python tools/test_belvo.py
   ```

### Qué esperar

- **Paso 1:** lista los bancos de Colombia disponibles → confirma que tus llaves funcionan.
- **Pasos 2–3** (opcionales): si defines `BELVO_TEST_*`, crea un link de prueba y baja
  transacciones con su categoría automática.

### Importante

- **Sandbox NO conecta tu banco real**, usa bancos ficticios. Es para validar el flujo técnico.
- Para tu **banco real** necesitas llaves de **producción** (cuenta Belvo aprobada). El mismo
  script funciona cambiando `BELVO_ENV=production` y las llaves.
