import { NextRequest, NextResponse } from "next/server";
import { getMunicipalityProfile } from "@/lib/data/mca2-dal";
import { apiSuccess, apiOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return apiOptions();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const mun = await getMunicipalityProfile(slug);

  if (!mun) {
    return NextResponse.json(
      {
        error: "Municipality not found",
        message: `Nessun comune trovato per lo slug '${slug}'.`,
      },
      { status: 404 }
    );
  }

  // Struttura 5 Quadranti Bento A-E
  const civicData = {
    comune: {
      ust_code: mun.ust_code,
      name: mun.name,
      slug: mun.slug,
      circle: mun.circle,
      seat: mun.seat,
      population: mun.population,
    },
    quadrante_a_tariffe_causalita: {
      tassa_base_rifiuti: mun.civic_tariffs.waste_base_fee,
      sacco_ufficiale_35l_chf: mun.civic_tariffs.waste_bag_35l_chf,
      imposta_immobiliare_comunale: `${mun.civic_tariffs.real_estate_tax_permille.toFixed(1)} ‰`,
      tassa_cani_annuale_chf: mun.civic_tariffs.dog_tax_chf,
      gestione_acqua_fognature: `Azienda Acqua Potabile (${mun.circle})`,
    },
    quadrante_b_famiglie_infanzia: {
      assegno_nascita_chf: mun.civic_tariffs.birth_bonus_chf,
      assegno_parentale_note: "Prestazione cantonale IAS Bellinzona (RL 856.100, 3'000.00 CHF una tantum, RFL < 110k, sostanza < 400k)",
      retta_nido_infanzia: "Tariffa calmierata per fasce di reddito",
      mensa_scolastica_pasto_chf: `${mun.civic_tariffs.canteen_meal_chf.toFixed(2)} CHF`,
      sussidi_sport_musica_giovani_chf: "Fino a 200.00 CHF / giovane",
    },
    quadrante_c_terza_eta_sociale: {
      pasti_domicilio_spitex: "Attivo tramite consorzio regionale",
      agevolazioni_lidi_avs: "Tariffa ridotta per residenti titolari AVS/AI",
      trasporto_sociale_anziani: "Disponibile per visite sanitarie",
    },
    quadrante_d_clima_mobilita: {
      fondo_comunale_energia: mun.civic_tariffs.climate_fund_active
        ? "Incentivi comunali attivi per impianti fotovoltaici e termopompe"
        : "Accesso a sussidi cantonali FER Ticino",
      sconto_abbonamento_arcobaleno: "Contributo comunale per giovani e studenti",
      ecocentro_verde: "Smaltimento scarti vegetali gratuito presso ecocentro",
    },
    quadrante_e_sportello_istituzioni: {
      moltiplicatore_pf: mun.tax_multiplier_pf,
      moltiplicatore_pg: mun.tax_multiplier_pg,
      ha_moltiplicatore_pg_differenziato: mun.has_differentiated_pg,
      enti_amministrati: mun.entities,
    },
  };

  return apiSuccess(civicData);
}
