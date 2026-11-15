"""Test per il rilevatore deterministico di spunti Instagram S05-S10 e guardrail LLM."""

from __future__ import annotations

import json
import sys
from decimal import Decimal
from pathlib import Path
from unittest.mock import MagicMock, patch

from ofcl.cli import main
from ofcl.insights import (
    ART_192_DISCLAIMER,
    detect_all_social_insights,
    format_chf_it,
    polish_candidate_with_llm,
)
from ofcl.load.postgres_loader import PostgresLoader


def test_format_chf_it_exact_cents() -> None:
    assert format_chf_it(Decimal("-16130.65")) == "-16'130.65 CHF"
    assert format_chf_it(Decimal("1000.00")) == "1'000.00 CHF"


def test_detect_all_social_insights_s05_to_s10() -> None:
    municipalities = [
        {
            "ust_code": 5091,
            "name": "Ascona",
            "slug": "ascona",
            "tax_multiplier_pf": 75.0,
            "tax_multiplier_pg": 75.0,
            "civic_tariffs": {
                "waste_bag_35l_chf": 1.30,
                "dog_tax_chf": 115.00,
                "canteen_meal_chf": 9.00,
            },
            "summary_30s": {"debito_netto_pc_chf": 1450.00},
        },
        {
            "ust_code": 5096,
            "name": "Brione sopra Minusio",
            "slug": "brione-sopra-minusio",
            "tax_multiplier_pf": 85.0,
            "tax_multiplier_pg": 85.0,
            "civic_tariffs": {
                "waste_bag_35l_chf": 1.00,
                "dog_tax_chf": 80.00,
                "canteen_meal_chf": 7.50,
            },
            "summary_30s": {"debito_netto_pc_chf": 11775.00},
        },
        {
            "ust_code": 5113,
            "name": "Locarno",
            "slug": "locarno",
            "tax_multiplier_pf": 90.0,
            "tax_multiplier_pg": 97.0,
            "civic_tariffs": {
                "waste_bag_35l_chf": 1.80,
                "dog_tax_chf": 150.00,
                "canteen_meal_chf": 11.00,
            },
            "summary_30s": {"debito_netto_pc_chf": -250.00},
        },
    ]
    credits_rows = [
        {
            "ust_code": 5096,
            "municipality_slug": "brione-sopra-minusio",
            "municipality_name": "Brione sopra Minusio",
            "account_code": "615.5010.200",
            "description": "Messa in sicurezza tornante Jacomello",
            "mm_reference": "MM 532 / CC 2023",
            "fiscal_year": 2025,
            "voted_credit_chf": 361000.00,
            "spent_total_chf": 377130.65,
            "residual_chf": -16130.65,
            "pct_used": 104.47,
            "page_ref": 126,
        },
        {
            "ust_code": 5096,
            "municipality_slug": "brione-sopra-minusio",
            "municipality_name": "Brione sopra Minusio",
            "account_code": "150.5010.050",
            "description": "Digitalizzazione archivio",
            "mm_reference": "MM 551 / CC 2024",
            "fiscal_year": 2025,
            "voted_credit_chf": 95000.00,
            "spent_total_chf": 94500.00,
            "residual_chf": 500.00,
            "pct_used": 99.47,
            "page_ref": 127,
        },
    ]
    outlier_rows = [
        {
            "ust_code": 5096,
            "municipality_slug": "brione-sopra-minusio",
            "municipality_name": "Brione sopra Minusio",
            "population_band": "MICRO",
            "ref_year": 2025,
            "view_kind": "FUNZIONE",
            "function_code": "011",
            "canonical_label": "Municipio e Consiglio Comunale",
            "side": "SPESA",
            "amount_per_capita": "420.50",
            "band_median_pc": "210.00",
            "band_min_pc": "180.00",
            "band_max_pc": "420.50",
            "band_peer_count": 5,
            "delta_vs_band_median_pct": "100.24",
            "outlier_direction": "HIGH",
            "page": 42,
            "origin_url": "https://brione.ch/consuntivo2025.pdf",
        }
    ]
    divergence_rows = [
        {
            "ust_code": 5113,
            "municipality_slug": "locarno",
            "municipality_name": "Locarno",
            "ref_year": 2025,
            "view_kind": "NATURA",
            "account_code": "3170",
            "canonical_label": "Spese di rappresentanza e trasferte",
            "side": "SPESA",
            "budget_chf": "20000.00",
            "actual_chf": "35500.00",
            "delta_chf": "15500.00",
            "delta_pct": "77.50",
            "is_significant_divergence": True,
            "actual_page": 18,
            "actual_origin_url": "https://locarno.ch/consuntivo2025.pdf",
        }
    ]

    candidates = detect_all_social_insights(
        municipalities=municipalities,
        credits_rows=credits_rows,
        outlier_rows=outlier_rows,
        divergence_rows=divergence_rows,
        ref_year=2026,
    )
    codes = {c.signal_code for c in candidates}
    assert {
        "S05_CREDIT_OVERRUN",
        "S06_TARIFF_GAP",
        "S07_TAX_MULTIPLIER",
        "S08_PEER_COST_OUTLIER",
        "S09_BUDGET_DIVERGENCE",
        "S10_FUN_FACT",
    }.issubset(codes)

    for c in candidates:
        assert ART_192_DISCLAIMER in c.caption_draft
        assert len(c.source_urls) >= 1
        assert len(c.slides) >= 2
        assert "?" in c.question_for_municipality


def test_polish_candidate_with_llm_guardrail_rejects_hallucinated_numbers() -> None:
    base = detect_all_social_insights(
        municipalities=[],
        credits_rows=[
            {
                "ust_code": 5096,
                "municipality_slug": "brione-sopra-minusio",
                "municipality_name": "Brione sopra Minusio",
                "account_code": "615.5010.200",
                "description": "Tornante Jacomello",
                "mm_reference": "MM 532",
                "fiscal_year": 2025,
                "voted_credit_chf": 361000.00,
                "spent_total_chf": 377130.65,
                "residual_chf": -16130.65,
                "pct_used": 104.47,
                "page_ref": 126,
            }
        ],
    )[0]

    # Risposta LLM che rimuove tutte le cifre vere -> deve essere scartata a favore del template deterministico
    fake_resp = MagicMock()
    fake_resp.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "title": "Titolo senza numeri",
                            "question_for_municipality": "Domanda?",
                            "caption_draft": "Testo inventato senza nessuna cifra verificata.",
                        }
                    )
                }
            }
        ]
    }
    with patch("ofcl.insights.social_detector.httpx.post", return_value=fake_resp):
        res = polish_candidate_with_llm(base, api_key="test-key")
    assert res.generation_mode == "DETERMINISTIC"
    assert res.caption_draft == base.caption_draft


def test_save_social_drafts_dry_run_and_cli_insights(tmp_path: Path, monkeypatch) -> None:
    payload = {
        "municipalities": [
            {
                "ust_code": 5091,
                "name": "Ascona",
                "slug": "ascona",
                "tax_multiplier_pf": 75.0,
                "tax_multiplier_pg": 75.0,
                "civic_tariffs": {"waste_bag_35l_chf": 1.30},
            },
            {
                "ust_code": 5113,
                "name": "Locarno",
                "slug": "locarno",
                "tax_multiplier_pf": 90.0,
                "tax_multiplier_pg": 97.0,
                "civic_tariffs": {"waste_bag_35l_chf": 1.80},
            },
            {
                "ust_code": 5096,
                "name": "Brione sopra Minusio",
                "slug": "brione-sopra-minusio",
                "tax_multiplier_pf": 85.0,
                "tax_multiplier_pg": 85.0,
                "civic_tariffs": {"waste_bag_35l_chf": 1.00},
            },
        ],
        "credits": [],
    }
    in_json = tmp_path / "input.json"
    out_json = tmp_path / "out.json"
    in_json.write_text(json.dumps(payload), encoding="utf-8")

    monkeypatch.setattr(
        sys,
        "argv",
        ["ofcl", "insights", "--input-json", str(in_json), "--output-json", str(out_json)],
    )
    with patch("sys.exit") as mock_exit:
        main()
        mock_exit.assert_called_with(0)

    out_data = json.loads(out_json.read_text(encoding="utf-8"))
    assert len(out_data) >= 2
    loader = PostgresLoader()
    assert loader.save_social_drafts(out_data) == len(out_data)
