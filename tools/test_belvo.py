#!/usr/bin/env python3
"""
Prueba mínima de conexión con Belvo (sin dependencias externas: usa urllib stdlib).

Qué hace:
  1. Verifica que tus llaves de Belvo autentican correctamente.
  2. Lista las instituciones (bancos) disponibles en Colombia.
  3. (Opcional) Crea un LINK de prueba en sandbox y baja cuentas + transacciones.

IMPORTANTE:
  - SANDBOX usa bancos FICTICIOS, no tu banco real. Sirve para validar el flujo.
  - Para tu banco real necesitas llaves de PRODUCCION (cuenta Belvo aprobada).

Uso (PowerShell):
  $env:BELVO_SECRET_ID="...."; $env:BELVO_SECRET_PASSWORD="...."; python tools/test_belvo.py
o crea un archivo .env basado en tools/.env.example y expórtalo.

Variables de entorno:
  BELVO_SECRET_ID         (obligatoria)
  BELVO_SECRET_PASSWORD   (obligatoria)
  BELVO_ENV               sandbox | development | production   (default: sandbox)
  BELVO_TEST_INSTITUTION  institución sandbox para crear link  (ej: erebor_co_retail)
  BELVO_TEST_USERNAME     usuario de prueba del sandbox        (ver docs de Belvo)
  BELVO_TEST_PASSWORD     password de prueba del sandbox       (ver docs de Belvo)
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request

BASE_URLS = {
    "sandbox": "https://sandbox.belvo.com",
    "development": "https://development.belvo.com",
    "production": "https://api.belvo.com",
}


def _client(env, secret_id, secret_password):
    base = BASE_URLS.get(env, BASE_URLS["sandbox"])
    token = base64.b64encode(f"{secret_id}:{secret_password}".encode()).decode()

    def request(method, path, body=None):
        url = f"{base}{path}"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Basic {token}")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status, json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            detail = e.read().decode()
            return e.code, detail

    return request


def main():
    secret_id = os.environ.get("BELVO_SECRET_ID")
    secret_password = os.environ.get("BELVO_SECRET_PASSWORD")
    env = os.environ.get("BELVO_ENV", "sandbox")

    if not secret_id or not secret_password:
        print("ERROR: define BELVO_SECRET_ID y BELVO_SECRET_PASSWORD.")
        print("Crea una cuenta sandbox en https://dashboard.belvo.com y genera tus llaves.")
        sys.exit(1)

    print(f"== Entorno Belvo: {env} ==\n")
    api = _client(env, secret_id, secret_password)

    # 1) Auth + 2) Instituciones de Colombia
    print("[1/3] Verificando auth y listando bancos de Colombia...")
    status, data = api("GET", "/api/institutions/?country_codes=CO&page_size=100")
    if status != 200:
        print(f"  FALLO ({status}): {data}")
        print("  Revisa que las llaves sean correctas y correspondan al entorno elegido.")
        sys.exit(1)

    results = data.get("results", []) if isinstance(data, dict) else []
    print(f"  OK. {len(results)} instituciones en Colombia:")
    for inst in results:
        print(f"    - {inst.get('name'):<28} display='{inst.get('display_name')}'  type={inst.get('type')}")

    # 3) (Opcional) crear link de prueba y bajar transacciones
    inst = os.environ.get("BELVO_TEST_INSTITUTION")
    user = os.environ.get("BELVO_TEST_USERNAME")
    pwd = os.environ.get("BELVO_TEST_PASSWORD")
    if not (inst and user and pwd):
        print("\n[2/3] (Saltado) Para crear un LINK de prueba define BELVO_TEST_INSTITUTION/")
        print("       BELVO_TEST_USERNAME/BELVO_TEST_PASSWORD (credenciales de prueba del sandbox).")
        print("       Consulta: https://developers.belvo.com/docs/test-in-sandbox")
        print("\n[3/3] Listo. La autenticación y el acceso a la API funcionan. ✅")
        return

    print(f"\n[2/3] Creando link de prueba en '{inst}'...")
    status, link = api("POST", "/api/links/", {
        "institution": inst,
        "username": user,
        "password": pwd,
        "access_mode": "single",
    })
    if status not in (200, 201):
        print(f"  FALLO ({status}): {link}")
        sys.exit(1)
    link_id = link.get("id")
    print(f"  OK. link_id = {link_id}")

    print("\n[3/3] Bajando transacciones del link...")
    status, txs = api("POST", "/api/transactions/", {
        "link": link_id,
        "date_from": "2024-01-01",
    })
    if status not in (200, 201):
        print(f"  FALLO ({status}): {txs}")
        sys.exit(1)
    items = txs.get("results", txs) if isinstance(txs, dict) else txs
    print(f"  OK. {len(items)} transacciones. Muestra (con categoría de Belvo):")
    for t in (items[:10] if isinstance(items, list) else []):
        print(f"    {t.get('value_date')}  {str(t.get('amount')):>12}  "
              f"{(t.get('category') or '-'):<22} {t.get('description')}")
    print("\nConexión y categorización automática verificadas. ✅")


if __name__ == "__main__":
    main()
