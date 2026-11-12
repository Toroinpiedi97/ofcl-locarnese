"""
Script di applicazione del seed.sql su Supabase ofcl-prod.
Include verifica rigorosa del guardrail C-01.
"""

import os
import sys
from pathlib import Path

import psycopg

from ofcl.seed_ref import enforce_corfin_guardrail


def main() -> None:
    enforce_corfin_guardrail()
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        # Carica da file .env se presente
        env_path = Path(__file__).resolve().parents[2] / ".env"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("DATABASE_URL="):
                    db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

    if not db_url or "[PASSWORD]" in db_url:
        print("[ERROR] DATABASE_URL non configurata o incompleta.", file=sys.stderr)
        sys.exit(1)

    enforce_corfin_guardrail()

    repo_root = Path(__file__).resolve().parents[2]
    seed_file = repo_root / "supabase" / "seed.sql"

    if not seed_file.exists():
        print(f"File non trovato: {seed_file}", file=sys.stderr)
        sys.exit(1)

    print(f"Lettura seed SQL ({seed_file.stat().st_size} bytes)...")
    sql_content = seed_file.read_text(encoding="utf-8")

    print("Connessione a Supabase ofcl-prod...")
    with psycopg.connect(db_url, autocommit=True) as conn, conn.cursor() as cur:
        print("Esecuzione seed.sql...")
        cur.execute(sql_content)
        print("Seed completato con successo!")

        # Verifica conteggi
        cur.execute("SELECT count(*) FROM ref.municipality;")
        mun_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM ref.account_mca2;")
        acc_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM ref.tax_multiplier;")
        mult_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM ref.indicator_def;")
        ind_count = cur.fetchone()[0]

        print("\n--- VERIFICA DATI CARICATI ---")
        print(f"Comuni Locarnese (ref.municipality): {mun_count}/19")
        print(f"Conti Piano MCA2 (ref.account_mca2): {acc_count}")
        print(f"Moltiplicatori Fiscali (ref.tax_multiplier): {mult_count}")
        print(f"Indicatori Ufficiali SEL (ref.indicator_def): {ind_count}/8")


if __name__ == "__main__":
    main()
