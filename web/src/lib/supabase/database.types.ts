export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  ref: {
    Tables: {
      municipality: {
        Row: {
          ust_code: number;
          slug: string;
          name: string;
          seat: string;
          circle: string;
          district_code: number;
          cms_family: "ASSOLO" | "WORDPRESS" | "JOOMLA" | "CUSTOM_PHP" | "CITY_LOCARNO";
          valid_from: string | null;
          merger_note: string | null;
          active: boolean;
        };
        Insert: {
          ust_code: number;
          slug: string;
          name: string;
          seat: string;
          circle: string;
          district_code?: number;
          cms_family: "ASSOLO" | "WORDPRESS" | "JOOMLA" | "CUSTOM_PHP" | "CITY_LOCARNO";
          valid_from?: string | null;
          merger_note?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["ref"]["Tables"]["municipality"]["Insert"]>;
      };
      entity: {
        Row: {
          id: string;
          ust_code: number;
          kind: "COMUNE" | "AAP" | "AE" | "PORTO" | "CASA_ANZIANI" | "ENTE_AUTONOMO" | "ALTRO";
          name: string;
          aliases: string[];
          is_default: boolean;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          id?: string;
          ust_code: number;
          kind: "COMUNE" | "AAP" | "AE" | "PORTO" | "CASA_ANZIANI" | "ENTE_AUTONOMO" | "ALTRO";
          name: string;
          aliases?: string[];
          is_default?: boolean;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: Partial<Database["ref"]["Tables"]["entity"]["Insert"]>;
      };
      account_mca2: {
        Row: {
          code: string;
          level: number;
          parent_code: string | null;
          label_it: string;
          statement: "CE" | "CI" | "BI";
          source_url: string;
        };
        Insert: {
          code: string;
          level: number;
          parent_code?: string | null;
          label_it: string;
          statement: "CE" | "CI" | "BI";
          source_url: string;
        };
        Update: Partial<Database["ref"]["Tables"]["account_mca2"]["Insert"]>;
      };
      function_mca2: {
        Row: {
          code: string;
          level: number;
          parent_code: string | null;
          label_it: string;
        };
        Insert: {
          code: string;
          level: number;
          parent_code?: string | null;
          label_it: string;
        };
        Update: Partial<Database["ref"]["Tables"]["function_mca2"]["Insert"]>;
      };
      population: {
        Row: {
          ust_code: number;
          year: number;
          residents: number;
          definition: string;
          source_url: string;
        };
        Insert: {
          ust_code: number;
          year: number;
          residents: number;
          definition?: string;
          source_url: string;
        };
        Update: Partial<Database["ref"]["Tables"]["population"]["Insert"]>;
      };
      tax_multiplier: {
        Row: {
          ust_code: number;
          year: number;
          pf_pct: number;
          pg_pct: number;
          source_url: string;
          verification: "VERIFIED" | "SEED_UNCONFIRMED";
        };
        Insert: {
          ust_code: number;
          year: number;
          pf_pct: number;
          pg_pct: number;
          source_url: string;
          verification?: "VERIFIED" | "SEED_UNCONFIRMED";
        };
        Update: Partial<Database["ref"]["Tables"]["tax_multiplier"]["Insert"]>;
      };
      indicator_def: {
        Row: {
          code: string;
          label_it: string;
          formula_text: string;
          unit: "PCT" | "CHF_PER_CAPITA" | "INDEX";
          higher_is_better: boolean;
        };
        Insert: {
          code: string;
          label_it: string;
          formula_text: string;
          unit: "PCT" | "CHF_PER_CAPITA" | "INDEX";
          higher_is_better: boolean;
        };
        Update: Partial<Database["ref"]["Tables"]["indicator_def"]["Insert"]>;
      };
      indicator_scale: {
        Row: {
          id: number;
          indicator_code: string;
          valid_from: string;
          band_order: number;
          lower_bound: number | null;
          upper_bound: number | null;
          label_it: string;
          color_token: "good" | "warning" | "critical";
          source_url: string;
        };
        Insert: {
          id?: number;
          indicator_code: string;
          valid_from: string;
          band_order: number;
          lower_bound?: number | null;
          upper_bound?: number | null;
          label_it: string;
          color_token: "good" | "warning" | "critical";
          source_url: string;
        };
        Update: Partial<Database["ref"]["Tables"]["indicator_scale"]["Insert"]>;
      };
      civic_benefit_def: {
        Row: {
          code: string;
          quadrant: "A_TARIFFE" | "B_FAMIGLIE" | "C_TERZA_ETA" | "D_CLIMA_MOBILITA" | "E_FISCO_SPORTELLO";
          label_it: string;
          unit_hint: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          quadrant: "A_TARIFFE" | "B_FAMIGLIE" | "C_TERZA_ETA" | "D_CLIMA_MOBILITA" | "E_FISCO_SPORTELLO";
          label_it: string;
          unit_hint: string;
          sort_order?: number;
        };
        Update: Partial<Database["ref"]["Tables"]["civic_benefit_def"]["Insert"]>;
      };
      municipal_civic_item: {
        Row: {
          ust_code: number;
          benefit_code: string;
          valid_year: number;
          status: "ACTIVE" | "NOT_APPLICABLE" | "UNVERIFIED";
          value_display: string;
          amount_min_chf: number | null;
          amount_max_chf: number | null;
          pct_value: number | null;
          conditions_short: string | null;
          ordinance_ref: string | null;
          source_url: string;
          verified_at: string | null;
        };
        Insert: {
          ust_code: number;
          benefit_code: string;
          valid_year: number;
          status?: "ACTIVE" | "NOT_APPLICABLE" | "UNVERIFIED";
          value_display: string;
          amount_min_chf?: number | null;
          amount_max_chf?: number | null;
          pct_value?: number | null;
          conditions_short?: string | null;
          ordinance_ref?: string | null;
          source_url: string;
          verified_at?: string | null;
        };
        Update: Partial<Database["ref"]["Tables"]["municipal_civic_item"]["Insert"]>;
      };
    };
  };
  audit: {
    Tables: {
      curator_action: {
        Row: {
          id: number;
          actor: string;
          action: "APPROVE" | "REJECT" | "CORRECT_VALUE" | "OVERRIDE_BLOCKING" | "PUBLISH" | "UNPUBLISH" | "MARK_PERSONAL_DATA";
          target_table: string;
          target_id: string;
          before: Json | null;
          after: Json | null;
          reason: string;
          at: string;
        };
        Insert: {
          id?: number;
          actor: string;
          action: "APPROVE" | "REJECT" | "CORRECT_VALUE" | "OVERRIDE_BLOCKING" | "PUBLISH" | "UNPUBLISH" | "MARK_PERSONAL_DATA";
          target_table: string;
          target_id: string;
          before?: Json | null;
          after?: Json | null;
          reason: string;
          at?: string;
        };
        Update: Partial<Database["audit"]["Tables"]["curator_action"]["Insert"]>;
      };
      feedback_ticket: {
        Row: {
          id: string;
          ust_code: number | null;
          version_id: string | null;
          target_metric: string | null;
          page_path: string;
          message_clean: string;
          reporter_email: string | null;
          ip_hash: string;
          status: "NEW" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
          resolution_note: string | null;
          resolved_by: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          ust_code?: number | null;
          version_id?: string | null;
          target_metric?: string | null;
          page_path: string;
          message_clean: string;
          reporter_email?: string | null;
          ip_hash: string;
          status?: "NEW" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
          resolution_note?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["audit"]["Tables"]["feedback_ticket"]["Insert"]>;
      };
    };
  };
  api: {
    Views: {
      municipal_civic_guide: {
        Row: {
          ust_code: number;
          municipality_slug: string;
          municipality_name: string;
          benefit_code: string;
          quadrant: "A_TARIFFE" | "B_FAMIGLIE" | "C_TERZA_ETA" | "D_CLIMA_MOBILITA" | "E_FISCO_SPORTELLO";
          label_it: string;
          unit_hint: string;
          sort_order: number;
          valid_year: number;
          status: "ACTIVE" | "NOT_APPLICABLE" | "UNVERIFIED";
          value_display: string;
          amount_min_chf: number | null;
          amount_max_chf: number | null;
          pct_value: number | null;
          conditions_short: string | null;
          ordinance_ref: string | null;
          source_url: string;
          verified_at: string;
        };
      };
      municipalities: {
        Row: {
          ust_code: number;
          slug: string;
          name: string;
          circle: string;
          seat: string;
          active: boolean;
          latest_population: number | null;
          latest_population_year: number | null;
          tax_multiplier_pf: number | null;
          tax_multiplier_pg: number | null;
          tax_multiplier_year: number | null;
          consuntivo_count: number;
          preventivo_count: number;
          latest_consuntivo_year: number | null;
          latest_preventivo_year: number | null;
        };
      };
      summary_by_year: {
        Row: {
          entity_id: string;
          ust_code: number;
          municipality_name: string;
          entity_kind: string;
          entity_name: string;
          ref_year: number;
          value_kind: "ACTUAL" | "BUDGET" | "PLAN";
          spese_operative: number;
          ricavi_operativi: number;
          spese_finanziarie_34: number;
          ricavi_finanziari_44: number;
          spese_straordinarie_38: number;
          ricavi_straordinari_48: number;
          addebiti_interni_39: number;
          accrediti_interni_49: number;
          uscite_investimenti_ba: number;
          entrate_investimenti_ba: number;
        };
      };
      indicators: {
        Row: {
          id: number;
          version_id: string;
          doc_type: string;
          fiscal_year: number;
          entity_id: string;
          ust_code: number;
          municipality_name: string;
          indicator_code: string;
          indicator_label: string;
          unit: "PCT" | "CHF_PER_CAPITA" | "INDEX";
          formula_text: string;
          higher_is_better: boolean;
          reported_value: number | null;
          computed_value: number | null;
          diff_value: number | null;
          source_page: number | null;
          band_label: string | null;
          band_color: "good" | "warning" | "critical" | null;
        };
      };
      documents: {
        Row: {
          version_id: string;
          document_id: string;
          ust_code: number;
          municipality_name: string;
          municipality_slug: string;
          doc_type: string | null;
          fiscal_year: number | null;
          mm_number: string | null;
          budget_stage: string | null;
          title_raw: string | null;
          origin_url: string;
          published_on: string | null;
          acquisition: "CRAWLER" | "MANUAL_UPLOAD" | "LIT_REQUEST";
          sha256: string;
          file_size_bytes: number;
          page_count: number;
          fetched_at: string;
          published_at: string | null;
          status: string;
        };
      };
      coverage: {
        Row: {
          ust_code: number;
          municipality_slug: string;
          municipality_name: string;
          fiscal_year: number;
          doc_type: string;
          version_status: string;
          published_versions_count: number;
          last_published_at: string | null;
        };
      };
      investment_credits_overview: {
        Row: {
          id: string;
          ust_code: number;
          municipality_name: string;
          mm_number: string | null;
          account_full: string;
          title: string;
          vote_date: string | null;
          authorization: "CC" | "LEGAL_DELEGATION" | "URGENCY";
          amount_voted: number;
          net_expected: number | null;
          status: "VOTED" | "IN_PROGRESS" | "CLOSED" | "REVOKED";
          last_snapshot_year: number | null;
          used_at_0101: number | null;
          spent_year: number | null;
          spent_total: number | null;
          residual: number | null;
          overrun: number | null;
          page: number | null;
        };
      };
    };
  };
};
