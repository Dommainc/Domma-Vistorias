"""
Intercepta a resposta real da edge function cv-crm-mapa para inspecionar
campos retornados pelo CVCRM (situacao, bloco, etc.).
"""
import json
import sys
from playwright.sync_api import sync_playwright

TARGET_URL = "http://localhost:8080"
EMP_ID = "2"  # Reserva Equitativa — primeiro da lista

def main():
    captured = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()

        # Interceptar chamadas à edge function
        def handle_response(response):
            if "cv-crm-mapa" in response.url:
                try:
                    body = response.json()
                    captured["raw"] = body
                    captured["status"] = response.status
                except Exception as e:
                    captured["error"] = str(e)

        page.on("response", handle_response)

        # Login automático — vai para / que redireciona para /login
        page.goto(f"{TARGET_URL}/login", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # Preenche credenciais (supabase.ti)
        page.locator('input[type="email"]').fill("suporte.ti@dommainc.com.br")
        page.locator('input[type="password"]').fill("Domma@2025!")
        page.locator('button[type="submit"]').click()
        page.wait_for_url(f"{TARGET_URL}/", timeout=10000)
        page.wait_for_timeout(1000)

        # Navega para o mapa
        page.goto(f"{TARGET_URL}/mapa", wait_until="networkidle")
        page.wait_for_timeout(500)

        # Abre o select de empreendimento
        page.locator('[role="combobox"]').click()
        page.wait_for_timeout(300)

        # Clica na opção (Reserva Equitativa é id=2)
        page.locator('[role="option"]').first.click()
        page.wait_for_timeout(5000)  # espera edge function

        browser.close()

    if "error" in captured:
        print(f"ERRO ao parsear resposta: {captured['error']}")
        sys.exit(1)

    if "raw" not in captured:
        print("NENHUMA chamada à edge function foi capturada.")
        sys.exit(1)

    raw = captured["raw"]
    dados = raw.get("dados", [])

    print(f"HTTP status da edge function: {captured['status']}")
    print(f"Total de itens retornados: {len(dados)}")

    if not dados:
        print("Nenhum dado retornado — verifique credenciais CVCRM.")
        print("Resposta completa:", json.dumps(raw, indent=2, ensure_ascii=False)[:2000])
        sys.exit(0)

    # Campos disponíveis
    print("\n=== CAMPOS DISPONÍVEIS (primeiro item) ===")
    first = dados[0]
    for k, v in first.items():
        print(f"  {k!r}: {v!r}")

    # Valores únicos de campos-chave
    for campo in ["situacao", "status", "situacao_unidade", "status_unidade",
                  "bloco", "nome_bloco", "idbloco", "bl",
                  "etapa", "fase", "nome_etapa", "idetapa"]:
        valores = list({str(d.get(campo, "")) for d in dados if d.get(campo) not in (None, "", 0)})
        if valores:
            print(f"\n  Valores únicos de {campo!r} ({len(valores)}):")
            for v in sorted(valores)[:20]:
                print(f"    {v!r}")

    # Salva amostra completa
    out_path = "scripts/cvcrm_sample.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dados[:20], f, indent=2, ensure_ascii=False)
    print(f"\nAmostra de 20 itens salva em {out_path}")

if __name__ == "__main__":
    main()
