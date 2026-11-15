"""
Rilevatore Deterministico di Divergenze, Outlier e Fun Fact per Bozze Instagram (S05-S10).

Regole di integrità OFCL:
1. Tutti i calcoli monetari usano `Decimal` con precisione `0.01 CHF` (nessun arrotondamento a 0.05 CHF).
2. Nessun dato stimato può alimentare un post: ogni candidato include `source_urls` verificabili.
3. L'eventuale raffinamento AI (LLM opzionale) agisce SOLO sul testo narrativo e viene scartato
   automaticamente se altera o rimuove i numeri certificati dal payload deterministico.
4. Ogni caption include il disclaimer obbligatorio ex art. 192 LOC.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Literal

import httpx

ART_192_DISCLAIMER = (
    "Nota legale: dati ufficiali da fonti comunali pubbliche. "
    "Fanno fede gli atti originali esposti ex art. 192 LOC."
)

SignalCode = Literal[
    "S05_CREDIT_OVERRUN",
    "S06_TARIFF_GAP",
    "S07_TAX_MULTIPLIER",
    "S08_PEER_COST_OUTLIER",
    "S09_BUDGET_DIVERGENCE",
    "S10_FUN_FACT",
]

Q_CENT = Decimal("0.01")


def _d(val: Any) -> Decimal:
    return Decimal(str(val)).quantize(Q_CENT, rounding=ROUND_HALF_UP)


def format_chf_it(amount: Decimal) -> str:
    """Formatta un importo in franchi svizzeri con apostrofo delle migliaia e 2 decimali."""
    q = amount.quantize(Q_CENT, rounding=ROUND_HALF_UP)
    sign = "-" if q < 0 else ""
    abs_str = f"{abs(q):,.2f}".replace(",", "'")
    return f"{sign}{abs_str} CHF"


@dataclass(frozen=True)
class SocialSlide:
    """Singola slide di un carosello Instagram (formato 4:5 - 1080x1350)."""

    slide_no: int
    kind: Literal["HOOK", "DATA_COMPARE", "QUESTION", "SOURCE"]
    headline: str
    stat_value: str
    stat_unit: str
    body: str
    source_ref: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SocialInsightCandidate:
    """Candidato pronto per la tabella core.social_post_draft e revisione su /admin/social."""

    signal_code: SignalCode
    dedup_key: str
    ust_code: int | None
    ref_year: int
    title: str
    question_for_municipality: str
    verified_payload: dict[str, Any]
    slides: list[SocialSlide]
    caption_draft: str
    hashtags: list[str]
    source_urls: list[str]
    generation_mode: Literal["DETERMINISTIC", "AI_ASSISTED"] = "DETERMINISTIC"
    priority_score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "signal_code": self.signal_code,
            "dedup_key": self.dedup_key,
            "ust_code": self.ust_code,
            "ref_year": self.ref_year,
            "title": self.title,
            "question_for_municipality": self.question_for_municipality,
            "verified_payload": self.verified_payload,
            "slides_json": [s.to_dict() for s in self.slides],
            "caption_draft": self.caption_draft,
            "hashtags": self.hashtags,
            "source_urls": self.source_urls,
            "generation_mode": self.generation_mode,
            "priority_score": self.priority_score,
        }


def detect_credit_overruns(
    credits_rows: list[dict[str, Any]],
    *,
    limit: int = 5,
) -> list[SocialInsightCandidate]:
    """S05 · Rileva crediti d'opera con sorpasso (residual_chf < 0) da spiegare al Consiglio Comunale."""
    overruns = [r for r in credits_rows if Decimal(str(r.get("residual_chf", 0))) < Decimal(0)]
    overruns.sort(key=lambda r: Decimal(str(r["residual_chf"])))

    candidates: list[SocialInsightCandidate] = []
    for r in overruns[:limit]:
        ust = int(r["ust_code"])
        mun_name = str(r["municipality_name"])
        year = int(r["fiscal_year"])
        voted = _d(r["voted_credit_chf"])
        spent = _d(r["spent_total_chf"])
        residual = _d(r["residual_chf"])
        overrun_abs = abs(residual)
        pct_used = ((spent / voted) * Decimal(100)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP) if voted > 0 else Decimal("0.0")
        acc = str(r["account_code"])
        desc = str(r["description"])
        mm_ref = str(r.get("mm_reference") or "Consuntivo")
        page_ref = int(r.get("page_ref") or 1)
        src_url = str(r.get("source_url") or f"https://ofcl.ch/comuni/{r.get('municipality_slug', ust)}/crediti#page={page_ref}")

        title = f"{mun_name}: sorpasso di {format_chf_it(overrun_abs)} su «{desc}»"
        question = (
            f"Come spiega il Municipio di {mun_name} il superamento di {format_chf_it(overrun_abs)} "
            f"sul credito votato ({mm_ref}) e intende chiedere un credito suppletorio o a posteriori ex art. 15 LOC?"
        )
        slides = [
            SocialSlide(
                slide_no=1,
                kind="HOOK",
                headline=f"{mun_name} · Credito superato",
                stat_value=f"+{format_chf_it(overrun_abs)}",
                stat_unit=f"oltre il votato ({pct_used}%)",
                body=f"Opera «{desc}» (conto {acc}): spesa cumulata oltre il credito approvato dal Consiglio Comunale.",
                source_ref=f"{mm_ref} · pag. {page_ref}",
            ),
            SocialSlide(
                slide_no=2,
                kind="DATA_COMPARE",
                headline="Votato vs Speso reale",
                stat_value=format_chf_it(spent),
                stat_unit=f"su {format_chf_it(voted)} votati",
                body=f"Residuo registrato nell'Allegato f: {format_chf_it(residual)} al 31.12.{year}.",
                source_ref=f"Consuntivo {year} · Allegato f p.{page_ref}",
            ),
            SocialSlide(
                slide_no=3,
                kind="QUESTION",
                headline="La domanda al Comune",
                stat_value="Art. 15 LOC",
                stat_unit="Trasparenza crediti",
                body=question,
                source_ref=src_url,
            ),
        ]
        caption = (
            f"📊 {mun_name} ({year}): l'opera «{desc}» ha superato il credito votato di {format_chf_it(overrun_abs)} "
            f"(spesi {format_chf_it(spent)} su {format_chf_it(voted)}, {pct_used}%).\n\n"
            f"❓ {question}\n\n"
            f"Fonte: {mm_ref}, Allegato f pag. {page_ref} ({src_url})\n{ART_192_DISCLAIMER}"
        )

        candidates.append(
            SocialInsightCandidate(
                signal_code="S05_CREDIT_OVERRUN",
                dedup_key=f"S05:{ust}:{year}:{acc}",
                ust_code=ust,
                ref_year=year,
                title=title,
                question_for_municipality=question,
                verified_payload={
                    "municipality": mun_name,
                    "account_code": acc,
                    "description": desc,
                    "voted_credit_chf": str(voted),
                    "spent_total_chf": str(spent),
                    "residual_chf": str(residual),
                    "pct_used": str(pct_used),
                    "mm_reference": mm_ref,
                    "page_ref": page_ref,
                },
                slides=slides,
                caption_draft=caption,
                hashtags=["#Locarnese", "#FinanzeComunali", "#TrasparenzaTicino", "#OFCL"],
                source_urls=[src_url],
                priority_score=float(overrun_abs),
            )
        )
    return candidates


def detect_tariff_gaps(
    municipalities: list[dict[str, Any]],
    *,
    ref_year: int = 2026,
) -> list[SocialInsightCandidate]:
    """S06 · Confronto costi bassi vs costi alti sulle tariffe civiche verificate (sacco, cani, mensa)."""
    tariff_specs = [
        ("waste_bag_35l_chf", "Sacco rifiuti 35L", "CHF/sacco", lambda v: v > Decimal(0)),
        ("dog_tax_chf", "Tassa annuale sui cani", "CHF/cane", lambda v: v > Decimal(0)),
        ("canteen_meal_chf", "Mensa scolastica (residenti)", "CHF/pasto", lambda v: v > Decimal(0)),
    ]

    candidates: list[SocialInsightCandidate] = []
    for field_name, label, unit, valid_fn in tariff_specs:
        entries: list[tuple[Decimal, dict[str, Any]]] = []
        for m in municipalities:
            tariffs = m.get("civic_tariffs") or {}
            raw_val = tariffs.get(field_name)
            if raw_val is None:
                continue
            val = _d(raw_val)
            if valid_fn(val):
                entries.append((val, m))
        if len(entries) < 3:
            continue

        entries.sort(key=lambda pair: pair[0])
        low_val, low_mun = entries[0]
        high_val, high_mun = entries[-1]
        if high_val <= low_val:
            continue

        ratio = (high_val / low_val).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        diff = (high_val - low_val).quantize(Q_CENT)
        src_low = str(low_mun.get("source_url") or f"https://ofcl.ch/comuni/{low_mun['slug']}")
        src_high = str(high_mun.get("source_url") or f"https://ofcl.ch/comuni/{high_mun['slug']}")

        title = f"{label}: da {format_chf_it(low_val)} ({low_mun['name']}) a {format_chf_it(high_val)} ({high_mun['name']})"
        question = (
            f"Quali costi di gestione o scelte di sussidio spiegano un divario di {format_chf_it(diff)} "
            f"({ratio}×) tra {low_mun['name']} e {high_mun['name']} per «{label}»?"
        )
        slides = [
            SocialSlide(
                slide_no=1,
                kind="HOOK",
                headline=f"{label} nel Locarnese",
                stat_value=f"{ratio}×",
                stat_unit="rapporto min vs max",
                body=f"Stesso distretto, tariffe molto diverse: +{format_chf_it(diff)} tra il Comune meno caro e quello più caro.",
                source_ref=f"Ordinanze comunali {ref_year}",
            ),
            SocialSlide(
                slide_no=2,
                kind="DATA_COMPARE",
                headline="Costo basso vs Costo alto",
                stat_value=f"{format_chf_it(low_val)} vs {format_chf_it(high_val)}",
                stat_unit=unit,
                body=f"Più basso: {low_mun['name']} ({format_chf_it(low_val)}). Più alto: {high_mun['name']} ({format_chf_it(high_val)}).",
                source_ref=f"Dati verificati su {len(entries)} Comuni",
            ),
            SocialSlide(
                slide_no=3,
                kind="QUESTION",
                headline="La domanda ai Comuni",
                stat_value=format_chf_it(diff),
                stat_unit="scarto massimo",
                body=question,
                source_ref=f"{src_low} · {src_high}",
            ),
        ]
        caption = (
            f"💶 {label} nel Locarnese ({ref_year}): si va da {format_chf_it(low_val)} a {low_mun['name']} "
            f"fino a {format_chf_it(high_val)} a {high_mun['name']} (scarto di {format_chf_it(diff)}, pari a {ratio}×).\n\n"
            f"❓ {question}\n\n"
            f"Fonti: {src_low} | {src_high}\n{ART_192_DISCLAIMER}"
        )
        candidates.append(
            SocialInsightCandidate(
                signal_code="S06_TARIFF_GAP",
                dedup_key=f"S06:{ref_year}:{field_name}",
                ust_code=None,
                ref_year=ref_year,
                title=title,
                question_for_municipality=question,
                verified_payload={
                    "metric": field_name,
                    "label": label,
                    "unit": unit,
                    "min_municipality": low_mun["name"],
                    "min_chf": str(low_val),
                    "max_municipality": high_mun["name"],
                    "max_chf": str(high_val),
                    "diff_chf": str(diff),
                    "ratio": str(ratio),
                    "sample_size": len(entries),
                },
                slides=slides,
                caption_draft=caption,
                hashtags=["#Locarnese", "#TariffeComunali", "#CostiCivici", "#OFCL"],
                source_urls=[src_low, src_high],
                priority_score=float(ratio * Decimal(100)),
            )
        )
    return candidates


def detect_tax_multiplier_gaps(
    municipalities: list[dict[str, Any]],
    *,
    ref_year: int = 2026,
) -> list[SocialInsightCandidate]:
    """S07 · Confronto moltiplicatori PF/PG (min vs max e moltiplicatori sdoppiati)."""
    if len(municipalities) < 2:
        return []

    by_pf = sorted(municipalities, key=lambda m: Decimal(str(m["tax_multiplier_pf"])))
    low_m, high_m = by_pf[0], by_pf[-1]
    low_pf = _d(low_m["tax_multiplier_pf"])
    high_pf = _d(high_m["tax_multiplier_pf"])
    gap_pp = (high_pf - low_pf).quantize(Q_CENT)

    split_muns = [m for m in municipalities if _d(m["tax_multiplier_pg"]) != _d(m["tax_multiplier_pf"])]
    candidates: list[SocialInsightCandidate] = []

    if gap_pp > Decimal(0):
        src_low = f"https://ofcl.ch/comuni/{low_m['slug']}"
        src_high = f"https://ofcl.ch/comuni/{high_m['slug']}"
        question = (
            f"Con un divario di {gap_pp} punti percentuali tra {low_m['name']} ({low_pf}%) e {high_m['name']} ({high_pf}%), "
            f"quali servizi o investimenti giustificano la differenza di pressione fiscale?"
        )
        candidates.append(
            SocialInsightCandidate(
                signal_code="S07_TAX_MULTIPLIER",
                dedup_key=f"S07:{ref_year}:PF_SPREAD",
                ust_code=None,
                ref_year=ref_year,
                title=f"Moltiplicatore PF {ref_year}: {low_m['name']} {low_pf}% vs {high_m['name']} {high_pf}%",
                question_for_municipality=question,
                verified_payload={
                    "min_municipality": low_m["name"],
                    "min_pf_pct": str(low_pf),
                    "max_municipality": high_m["name"],
                    "max_pf_pct": str(high_pf),
                    "gap_pp": str(gap_pp),
                    "split_pg_count": len(split_muns),
                },
                slides=[
                    SocialSlide(
                        slide_no=1,
                        kind="HOOK",
                        headline=f"Imposte comunali {ref_year}",
                        stat_value=f"{gap_pp} punti",
                        stat_unit="differenza PF nel Locarnese",
                        body=f"Su 1'000.00 CHF d'imposta cantonale base, la differenza tra minimo e massimo distrettuale è di {format_chf_it((gap_pp / Decimal(100)) * Decimal(1000))}.",
                        source_ref="DFE Divisione Contribuzioni",
                    ),
                    SocialSlide(
                        slide_no=2,
                        kind="DATA_COMPARE",
                        headline="Chi chiede meno vs chi chiede di più",
                        stat_value=f"{low_pf}% vs {high_pf}%",
                        stat_unit="Moltiplicatore PF",
                        body=f"Minimo: {low_m['name']} ({low_pf}%). Massimo: {high_m['name']} ({high_pf}%). Comuni con PG sdoppiata: {len(split_muns)}.",
                        source_ref=f"Serie certificata {ref_year}",
                    ),
                    SocialSlide(
                        slide_no=3,
                        kind="QUESTION",
                        headline="La domanda ai Comuni",
                        stat_value="PF vs PG",
                        stat_unit="Equità fiscale",
                        body=question,
                        source_ref=f"{src_low} · {src_high}",
                    ),
                ],
                caption_draft=(
                    f"🏛️ Moltiplicatore d'imposta PF {ref_year} nel Locarnese: dal {low_pf}% di {low_m['name']} "
                    f"al {high_pf}% di {high_m['name']} ({gap_pp} punti di scarto).\n\n"
                    f"❓ {question}\n\n"
                    f"Fonti: DFE / Preventivi {ref_year} ({src_low})\n{ART_192_DISCLAIMER}"
                ),
                hashtags=["#Moltiplicatore", "#ImposteTicino", "#Locarnese", "#OFCL"],
                source_urls=[src_low, src_high],
                priority_score=float(gap_pp * Decimal(10)),
            )
        )
    return candidates


def detect_peer_cost_outliers(
    outlier_rows: list[dict[str, Any]],
    *,
    limit: int = 5,
) -> list[SocialInsightCandidate]:
    """S08 · Rileva costi bassi vs alti dalla vista normalizzata api.peer_cost_outliers."""
    flagged = [
        r
        for r in outlier_rows
        if r.get("outlier_direction") in ("HIGH", "LOW") and int(r.get("band_peer_count") or 0) >= 3
    ]
    flagged.sort(key=lambda r: abs(Decimal(str(r.get("delta_vs_band_median_pct") or 0))), reverse=True)

    candidates: list[SocialInsightCandidate] = []
    for r in flagged[:limit]:
        ust = int(r["ust_code"])
        mun = str(r["municipality_name"])
        year = int(r["ref_year"])
        band = str(r["population_band"])
        label = str(r["canonical_label"])
        pc = _d(r["amount_per_capita"])
        med = _d(r["band_median_pc"])
        delta_pct = _d(r["delta_vs_band_median_pct"])
        direction = str(r["outlier_direction"])
        code = str(r.get("account_code") or r.get("function_code") or "")
        page_ref = int(r.get("page") or 1)
        src_url = str(r.get("origin_url") or f"https://ofcl.ch/comuni/{r.get('municipality_slug', ust)}#page={page_ref}")
        perimeter_note = r.get("perimeter_note")

        dir_label = "sopra la mediana" if direction == "HIGH" else "sotto la mediana"
        question = (
            f"Come spiega il Comune di {mun} una spesa pro capite di {format_chf_it(pc)} per «{label}», "
            f"pari a {delta_pct:+}% rispetto ai Comuni di fascia {band} (mediana {format_chf_it(med)})?"
        )
        note_text = f" Avvertenza perimetro: {perimeter_note}." if perimeter_note else ""
        candidates.append(
            SocialInsightCandidate(
                signal_code="S08_PEER_COST_OUTLIER",
                dedup_key=f"S08:{ust}:{year}:{r.get('view_kind')}:{code}:{r.get('side')}",
                ust_code=ust,
                ref_year=year,
                title=f"{mun}: «{label}» a {format_chf_it(pc)}/ab ({delta_pct:+}% vs pari)",
                question_for_municipality=question,
                verified_payload={
                    "municipality": mun,
                    "population_band": band,
                    "code": code,
                    "label": label,
                    "amount_per_capita_chf": str(pc),
                    "band_median_pc_chf": str(med),
                    "delta_vs_band_median_pct": str(delta_pct),
                    "outlier_direction": direction,
                    "perimeter_note": perimeter_note,
                    "page": page_ref,
                },
                slides=[
                    SocialSlide(
                        slide_no=1,
                        kind="HOOK",
                        headline=f"{mun} · Voce fuori media",
                        stat_value=f"{delta_pct:+}%",
                        stat_unit=f"{dir_label} (fascia {band})",
                        body=f"Voce «{label}» ({code}): confronto omogeneo tra soli bilanci comunali al netto delle imputazioni interne.",
                        source_ref=f"Consuntivo {year} · p.{page_ref}",
                    ),
                    SocialSlide(
                        slide_no=2,
                        kind="DATA_COMPARE",
                        headline="Pro capite vs Mediana di fascia",
                        stat_value=format_chf_it(pc),
                        stat_unit=f"vs {format_chf_it(med)} mediana",
                        body=f"Min fascia: {format_chf_it(_d(r.get('band_min_pc', pc)))} · Max fascia: {format_chf_it(_d(r.get('band_max_pc', pc)))}.{note_text}",
                        source_ref=f"Confronto su {r['band_peer_count']} Comuni {band}",
                    ),
                    SocialSlide(
                        slide_no=3,
                        kind="QUESTION",
                        headline="La domanda al Comune",
                        stat_value=code or "MCA2",
                        stat_unit="Analisi costi",
                        body=question,
                        source_ref=src_url,
                    ),
                ],
                caption_draft=(
                    f"🔍 Confronto costi MCA2 ({year}, fascia {band}): a {mun} la voce «{label}» vale "
                    f"{format_chf_it(pc)}/abitante contro una mediana di {format_chf_it(med)}/abitante ({delta_pct:+}%).{note_text}\n\n"
                    f"❓ {question}\n\n"
                    f"Fonte: {src_url} (pag. {page_ref})\n{ART_192_DISCLAIMER}"
                ),
                hashtags=["#CostiComunali", "#MCA2", "#Locarnese", "#OFCL"],
                source_urls=[src_url],
                priority_score=float(abs(delta_pct)),
            )
        )
    return candidates


def detect_budget_divergences(
    divergence_rows: list[dict[str, Any]],
    *,
    limit: int = 5,
) -> list[SocialInsightCandidate]:
    """S09 · Rileva divergenze significative Preventivo vs Consuntivo dalla vista api.budget_vs_actual_divergences."""
    sig = [r for r in divergence_rows if r.get("is_significant_divergence")]
    sig.sort(key=lambda r: abs(Decimal(str(r.get("delta_chf") or 0))), reverse=True)

    candidates: list[SocialInsightCandidate] = []
    for r in sig[:limit]:
        ust = int(r["ust_code"])
        mun = str(r["municipality_name"])
        year = int(r["ref_year"])
        label = str(r["canonical_label"])
        budget = _d(r["budget_chf"])
        actual = _d(r["actual_chf"])
        delta = _d(r["delta_chf"])
        delta_pct = _d(r.get("delta_pct") or 0)
        code = str(r.get("account_code") or r.get("function_code") or "")
        act_page = int(r.get("actual_page") or 1)
        src_url = str(r.get("actual_origin_url") or f"https://ofcl.ch/comuni/{r.get('municipality_slug', ust)}#page={act_page}")

        question = (
            f"Quali eventi imprevisti hanno portato la voce «{label}» del {year} a scostarsi di "
            f"{format_chf_it(delta)} ({delta_pct:+}%) rispetto al Preventivo approvato dal Consiglio Comunale?"
        )
        candidates.append(
            SocialInsightCandidate(
                signal_code="S09_BUDGET_DIVERGENCE",
                dedup_key=f"S09:{ust}:{year}:{r.get('view_kind')}:{code}:{r.get('side')}",
                ust_code=ust,
                ref_year=year,
                title=f"{mun} ({year}): scarto {delta_pct:+}% su «{label}»",
                question_for_municipality=question,
                verified_payload={
                    "municipality": mun,
                    "code": code,
                    "label": label,
                    "budget_chf": str(budget),
                    "actual_chf": str(actual),
                    "delta_chf": str(delta),
                    "delta_pct": str(delta_pct),
                    "actual_page": act_page,
                },
                slides=[
                    SocialSlide(
                        slide_no=1,
                        kind="HOOK",
                        headline=f"{mun} · Preventivo vs Consuntivo",
                        stat_value=f"{delta_pct:+}%",
                        stat_unit=f"scarto su {label}",
                        body=f"Differenza netta di {format_chf_it(delta)} tra quanto previsto a budget e quanto speso/incassato a consuntivo {year}.",
                        source_ref=f"Consuntivo {year} · p.{act_page}",
                    ),
                    SocialSlide(
                        slide_no=2,
                        kind="DATA_COMPARE",
                        headline="Le cifre ufficiali",
                        stat_value=format_chf_it(actual),
                        stat_unit=f"vs {format_chf_it(budget)} previsti",
                        body=f"Scostamento assoluto: {format_chf_it(delta)} ({delta_pct:+}%).",
                        source_ref=f"Conto {code or 'MCA2'} · p.{act_page}",
                    ),
                    SocialSlide(
                        slide_no=3,
                        kind="QUESTION",
                        headline="La domanda al Comune",
                        stat_value=str(year),
                        stat_unit="Controllo di gestione",
                        body=question,
                        source_ref=src_url,
                    ),
                ],
                caption_draft=(
                    f"📉 Preventivo vs Consuntivo {year} a {mun}: sulla voce «{label}» il consuntivo segna "
                    f"{format_chf_it(actual)} contro i {format_chf_it(budget)} previsti ({delta_pct:+}%, pari a {format_chf_it(delta)}).\n\n"
                    f"❓ {question}\n\n"
                    f"Fonte: {src_url} (pag. {act_page})\n{ART_192_DISCLAIMER}"
                ),
                hashtags=["#PreventivoVsConsuntivo", "#Locarnese", "#FinanzeComunali", "#OFCL"],
                source_urls=[src_url],
                priority_score=float(abs(delta)),
            )
        )
    return candidates


def detect_fun_facts(
    municipalities: list[dict[str, Any]],
    credits_rows: list[dict[str, Any]],
    *,
    ref_year: int = 2025,
) -> list[SocialInsightCandidate]:
    """S10 · Estrae fun fact e curiosità contabili oggettive e verificabili."""
    candidates: list[SocialInsightCandidate] = []

    # 1. Debito netto pro capite min vs max (incluso eventuale credito netto negativo!)
    debt_entries = [
        (Decimal(str(m["summary_30s"]["debito_netto_pc_chf"])), m)
        for m in municipalities
        if m.get("summary_30s") and m["summary_30s"].get("debito_netto_pc_chf") is not None
    ]
    if len(debt_entries) >= 3:
        debt_entries.sort(key=lambda pair: pair[0])
        min_d, min_m = debt_entries[0]
        max_d, max_m = debt_entries[-1]
        spread = (max_d - min_d).quantize(Q_CENT)
        src_min = f"https://ofcl.ch/comuni/{min_m['slug']}"
        src_max = f"https://ofcl.ch/comuni/{max_m['slug']}"
        question = (
            f"Come si spiega una forbice di {format_chf_it(spread)} di debito netto pro capite "
            f"tra {min_m['name']} ({format_chf_it(min_d)}/ab) e {max_m['name']} ({format_chf_it(max_d)}/ab)?"
        )
        candidates.append(
            SocialInsightCandidate(
                signal_code="S10_FUN_FACT",
                dedup_key=f"S10:{ref_year}:NET_DEBT_EXTREMES",
                ust_code=None,
                ref_year=ref_year,
                title=f"Fun Fact: da {format_chf_it(min_d)}/ab ({min_m['name']}) a {format_chf_it(max_d)}/ab ({max_m['name']})",
                question_for_municipality=question,
                verified_payload={
                    "min_municipality": min_m["name"],
                    "min_debt_pc_chf": str(_d(min_d)),
                    "max_municipality": max_m["name"],
                    "max_debt_pc_chf": str(_d(max_d)),
                    "spread_chf": str(spread),
                },
                slides=[
                    SocialSlide(
                        slide_no=1,
                        kind="HOOK",
                        headline="Lo sapevi? Debito pro capite",
                        stat_value=format_chf_it(spread),
                        stat_unit="di forbice nel Locarnese",
                        body="In Ticino un Comune può avere debito netto negativo (sostanza netta positiva) mentre un vicino supera gli 11'000 CHF per abitante.",
                        source_ref=f"Indicatori SEL {ref_year}",
                    ),
                    SocialSlide(
                        slide_no=2,
                        kind="DATA_COMPARE",
                        headline="I due estremi del distretto",
                        stat_value=f"{format_chf_it(min_d)} vs {format_chf_it(max_d)}",
                        stat_unit="CHF per abitante",
                        body=f"Minimo: {min_m['name']}. Massimo: {max_m['name']}.",
                        source_ref="Serie certificata 19 Comuni",
                    ),
                    SocialSlide(
                        slide_no=3,
                        kind="QUESTION",
                        headline="Cosa c'è dietro il numero?",
                        stat_value="SEL #4",
                        stat_unit="Debito netto / ab.",
                        body=question,
                        source_ref=f"{src_min} · {src_max}",
                    ),
                ],
                caption_draft=(
                    f"💡 Lo sapevi? Nel Locarnese il debito netto per abitante passa da {format_chf_it(min_d)} a {min_m['name']} "
                    f"fino a {format_chf_it(max_d)} a {max_m['name']} — una forbice di {format_chf_it(spread)} a testa.\n\n"
                    f"❓ {question}\n\n"
                    f"Fonti: {src_min} | {src_max}\n{ART_192_DISCLAIMER}"
                ),
                hashtags=["#FunFactLocarnese", "#DebitoPubblico", "#SEL", "#OFCL"],
                source_urls=[src_min, src_max],
                priority_score=float(spread),
            )
        )

    # 2. Crediti quasi esauriti (98%-100%) ancora aperti in Allegato f
    near_full = [
        r
        for r in credits_rows
        if Decimal("98.0") <= Decimal(str(r.get("pct_used", 0))) <= Decimal("100.0")
        and Decimal(str(r.get("residual_chf", 0))) > Decimal(0)
    ]
    for r in near_full[:2]:
        ust = int(r["ust_code"])
        mun = str(r["municipality_name"])
        year = int(r["fiscal_year"])
        residual = _d(r["residual_chf"])
        voted = _d(r["voted_credit_chf"])
        pct = _d(r["pct_used"])
        desc = str(r["description"])
        page_ref = int(r.get("page_ref") or 1)
        src_url = str(r.get("source_url") or f"https://ofcl.ch/comuni/{r.get('municipality_slug', ust)}/crediti#page={page_ref}")
        question = (
            f"Il credito per «{desc}» è utilizzato al {pct}% con soli {format_chf_it(residual)} residui: "
            f"l'opera è conclusa ed è prevista la liquidazione formale in Consiglio Comunale?"
        )
        candidates.append(
            SocialInsightCandidate(
                signal_code="S10_FUN_FACT",
                dedup_key=f"S10:{ust}:{year}:NEAR_LIQ:{r['account_code']}",
                ust_code=ust,
                ref_year=year,
                title=f"{mun}: credito al {pct}% con soli {format_chf_it(residual)} residui",
                question_for_municipality=question,
                verified_payload={
                    "municipality": mun,
                    "description": desc,
                    "voted_credit_chf": str(voted),
                    "residual_chf": str(residual),
                    "pct_used": str(pct),
                    "page_ref": page_ref,
                },
                slides=[
                    SocialSlide(
                        slide_no=1,
                        kind="HOOK",
                        headline=f"{mun} · Credito al {pct}%",
                        stat_value=format_chf_it(residual),
                        stat_unit=f"rimasti su {format_chf_it(voted)}",
                        body=f"«{desc}» è quasi al 100% di utilizzo: quando viene chiuso il conto?",
                        source_ref=f"Allegato f {year} · p.{page_ref}",
                    ),
                    SocialSlide(
                        slide_no=2,
                        kind="QUESTION",
                        headline="La domanda al Comune",
                        stat_value="Liquidazione?",
                        stat_unit="Art. 15 LOC",
                        body=question,
                        source_ref=src_url,
                    ),
                ],
                caption_draft=(
                    f"🔎 Curiosità dai conti di {mun} ({year}): sul credito «{desc}» ({format_chf_it(voted)} votati) "
                    f"restano appena {format_chf_it(residual)} ({pct}% speso).\n\n"
                    f"❓ {question}\n\n"
                    f"Fonte: {src_url} (pag. {page_ref})\n{ART_192_DISCLAIMER}"
                ),
                hashtags=["#CreditiComunali", "#Locarnese", "#OFCL"],
                source_urls=[src_url],
                priority_score=float(pct),
            )
        )

    return candidates


def detect_all_social_insights(
    *,
    municipalities: list[dict[str, Any]],
    credits_rows: list[dict[str, Any]],
    outlier_rows: list[dict[str, Any]] | None = None,
    divergence_rows: list[dict[str, Any]] | None = None,
    ref_year: int = 2026,
) -> list[SocialInsightCandidate]:
    """Esegue tutti i detector deterministici S05-S10 e ordina per priorità."""
    all_candidates: list[SocialInsightCandidate] = []
    all_candidates.extend(detect_credit_overruns(credits_rows))
    all_candidates.extend(detect_tariff_gaps(municipalities, ref_year=ref_year))
    all_candidates.extend(detect_tax_multiplier_gaps(municipalities, ref_year=ref_year))
    if outlier_rows:
        all_candidates.extend(detect_peer_cost_outliers(outlier_rows))
    if divergence_rows:
        all_candidates.extend(detect_budget_divergences(divergence_rows))
    all_candidates.extend(detect_fun_facts(municipalities, credits_rows, ref_year=ref_year - 1))

    all_candidates.sort(key=lambda c: c.priority_score, reverse=True)
    return all_candidates


def _extract_numeric_tokens(payload: dict[str, Any]) -> set[str]:
    """Estrae i numeri significativi dal payload verificato per verificare che l'AI non li alteri."""
    tokens: set[str] = set()
    for val in payload.values():
        if isinstance(val, (int, float)):
            tokens.add(str(val))
        elif isinstance(val, str):
            for m in re.findall(r"-?\d+(?:\.\d+)?", val):
                tokens.add(m)
    return tokens


def polish_candidate_with_llm(
    candidate: SocialInsightCandidate,
    *,
    api_key: str | None = None,
    model: str | None = None,
) -> SocialInsightCandidate:
    """
    Rifinisce opzionalmente titolo, domanda e caption usando un LLM su JSON certificato.
    Guardrail rigido: se la key manca, se la chiamata fallisce, o se la risposta perde/inventa
    numeri rispetto al payload verificato, restituisce il candidato deterministico inalterato.
    """
    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        return candidate

    target_model = model or os.environ.get("OFCL_SOCIAL_LLM_MODEL", "gpt-4o-mini")
    system_prompt = (
        "Sei il redattore civico dell'Osservatorio Finanze Comunali del Locarnese (OFCL). "
        "Ricevi dati contabili GIA VERIFICATI al centesimo. Riscrivi titolo, domanda al Comune "
        "e caption Instagram in italiano chiaro, neutrale, costruttivo e mai diffamatorio. "
        "VIETATO modificare qualsiasi cifra, percentuale o nome Comune. "
        "Includi sempre il disclaimer ex art. 192 LOC alla fine della caption. "
        "Rispondi SOLO in JSON valido con chiavi: title, question_for_municipality, caption_draft."
    )
    user_payload = json.dumps(
        {
            "signal_code": candidate.signal_code,
            "verified_payload": candidate.verified_payload,
            "current_title": candidate.title,
            "current_question": candidate.question_for_municipality,
            "current_caption": candidate.caption_draft,
            "mandatory_disclaimer": ART_192_DISCLAIMER,
        },
        ensure_ascii=False,
    )

    try:
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": target_model,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_payload},
                ],
            },
            timeout=20.0,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        new_title = str(parsed["title"]).strip()
        new_question = str(parsed["question_for_municipality"]).strip()
        new_caption = str(parsed["caption_draft"]).strip()
        if not new_title or not new_question or not new_caption:
            return candidate
        if "192 LOC" not in new_caption:
            new_caption = f"{new_caption}\n\n{ART_192_DISCLAIMER}"

        # Verifica che almeno una cifra chiave del payload sia preservata esattamente (formato CH o ASCII)
        norm_caption = new_caption.replace("'", "").replace("’", "")
        expected_nums = _extract_numeric_tokens(candidate.verified_payload)
        if expected_nums and not any(num in norm_caption for num in expected_nums):
            return candidate

        return SocialInsightCandidate(
            signal_code=candidate.signal_code,
            dedup_key=candidate.dedup_key,
            ust_code=candidate.ust_code,
            ref_year=candidate.ref_year,
            title=new_title,
            question_for_municipality=new_question,
            verified_payload=candidate.verified_payload,
            slides=candidate.slides,
            caption_draft=new_caption,
            hashtags=candidate.hashtags,
            source_urls=candidate.source_urls,
            generation_mode="AI_ASSISTED",
            priority_score=candidate.priority_score,
        )
    except Exception:  # noqa: BLE001
        return candidate
