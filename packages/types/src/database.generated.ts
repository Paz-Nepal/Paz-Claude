export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  admin: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor: string | null;
          after: Json | null;
          before: Json | null;
          context: Json | null;
          entity_id: string | null;
          entity_schema: string | null;
          entity_table: string | null;
          id: number;
          occurred_at: string;
        };
        Insert: {
          action: string;
          actor?: string | null;
          after?: Json | null;
          before?: Json | null;
          context?: Json | null;
          entity_id?: string | null;
          entity_schema?: string | null;
          entity_table?: string | null;
          id?: never;
          occurred_at?: string;
        };
        Update: {
          action?: string;
          actor?: string | null;
          after?: Json | null;
          before?: Json | null;
          context?: Json | null;
          entity_id?: string | null;
          entity_schema?: string | null;
          entity_table?: string | null;
          id?: never;
          occurred_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          email: string;
          full_name: string;
          id: string;
          kind: string;
          message: string;
          reviewed: boolean;
          reviewed_at: string | null;
          reviewed_by: string | null;
          submitted_at: string;
          work_id: string | null;
        };
        Insert: {
          email: string;
          full_name: string;
          id?: string;
          kind?: string;
          message: string;
          reviewed?: boolean;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string;
          work_id?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string;
          id?: string;
          kind?: string;
          message?: string;
          reviewed?: boolean;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string;
          work_id?: string | null;
        };
        Relationships: [];
      };
      intake_rate_limits: {
        Row: {
          endpoint: string;
          id: number;
          ip_hash: string;
          occurred_at: string;
        };
        Insert: {
          endpoint: string;
          id?: never;
          ip_hash: string;
          occurred_at?: string;
        };
        Update: {
          endpoint?: string;
          id?: never;
          ip_hash?: string;
          occurred_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      site_wording: {
        Row: {
          en: string | null;
          key: string;
          ne: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          en?: string | null;
          key: string;
          ne?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          en?: string | null;
          key?: string;
          ne?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string;
          p_ip_hash: string;
          p_max_count?: number;
          p_window_minutes?: number;
        };
        Returns: boolean;
      };
      log_system_event: {
        Args: {
          p_action: string;
          p_context: Json;
          p_entity_id: string;
          p_entity_schema: string;
          p_entity_table: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  api: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      admin_dealings: {
        Row: {
          accepted_on: string | null;
          arrived_on: string | null;
          buyer_country: string | null;
          buyer_email: string | null;
          buyer_name: string | null;
          carrier: string | null;
          created_at: string | null;
          customs_description: string | null;
          declared_value_minor: number | null;
          dispatched_on: string | null;
          enquiry_id: string | null;
          id: string | null;
          invoice_no: string | null;
          invoiced_on: string | null;
          list_price_minor: number | null;
          notes: string | null;
          person_name: string | null;
          quote: Json | null;
          quoted_on: string | null;
          stage: string | null;
          tracking: string | null;
          updated_at: string | null;
          work_id: string | null;
          work_number: number | null;
          work_title: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dealings_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "contact_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dealings_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dealings_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_encounters: {
        Row: {
          created_at: string | null;
          ends_on: string | null;
          how_to_turn_up: string | null;
          how_to_turn_up_ne: string | null;
          id: string | null;
          kind: string | null;
          leads_ne: boolean | null;
          place: string | null;
          place_ne: string | null;
          published: boolean | null;
          slug: string | null;
          starts_on: string | null;
          title: string | null;
          title_ne: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          ends_on?: string | null;
          how_to_turn_up?: string | null;
          how_to_turn_up_ne?: string | null;
          id?: string | null;
          kind?: string | null;
          leads_ne?: boolean | null;
          place?: string | null;
          place_ne?: string | null;
          published?: boolean | null;
          slug?: string | null;
          starts_on?: string | null;
          title?: string | null;
          title_ne?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          ends_on?: string | null;
          how_to_turn_up?: string | null;
          how_to_turn_up_ne?: string | null;
          id?: string | null;
          kind?: string | null;
          leads_ne?: boolean | null;
          place?: string | null;
          place_ne?: string | null;
          published?: boolean | null;
          slug?: string | null;
          starts_on?: string | null;
          title?: string | null;
          title_ne?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      admin_guild_makers: {
        Row: {
          created_at: string | null;
          destroyed_on: string | null;
          id: string | null;
          mark_description: string | null;
          person_id: string | null;
          person_name: string | null;
          presented_on: string | null;
          published: boolean | null;
          registered_on: string | null;
          stage: string | null;
          updated_at: string | null;
          year_letter: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "makers_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: true;
            referencedRelation: "admin_wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "makers_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: true;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "makers_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: true;
            referencedRelation: "wall_people";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_membership_tiers: {
        Row: {
          active: boolean | null;
          annual_fee_cents: number | null;
          description: string | null;
          description_ne: string | null;
          key: string | null;
          name: string | null;
          name_ne: string | null;
        };
        Insert: {
          active?: boolean | null;
          annual_fee_cents?: number | null;
          description?: string | null;
          description_ne?: string | null;
          key?: string | null;
          name?: string | null;
          name_ne?: string | null;
        };
        Update: {
          active?: boolean | null;
          annual_fee_cents?: number | null;
          description?: string | null;
          description_ne?: string | null;
          key?: string | null;
          name?: string | null;
          name_ne?: string | null;
        };
        Relationships: [];
      };
      admin_program_sessions: {
        Row: {
          capacity: number | null;
          ends_at: string | null;
          id: string | null;
          program_id: string | null;
          program_title: string | null;
          registered_count: number | null;
          starts_at: string | null;
          status: Database["programs"]["Enums"]["session_status"] | null;
          venue_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "admin_programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_programs: {
        Row: {
          active: boolean | null;
          description_item: string | null;
          id: string | null;
          slug: string | null;
          summary: string | null;
          title: string | null;
        };
        Insert: {
          active?: boolean | null;
          description_item?: string | null;
          id?: string | null;
          slug?: string | null;
          summary?: string | null;
          title?: string | null;
        };
        Update: {
          active?: boolean | null;
          description_item?: string | null;
          id?: string | null;
          slug?: string | null;
          summary?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "programs_description_item_fkey";
            columns: ["description_item"];
            isOneToOne: false;
            referencedRelation: "desk_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_description_item_fkey";
            columns: ["description_item"];
            isOneToOne: false;
            referencedRelation: "published_items";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_roles: {
        Row: {
          asks: string | null;
          created_at: string | null;
          gives: string | null;
          holder_name: string | null;
          how_to_say_yes: string | null;
          id: string | null;
          kind: string | null;
          published: boolean | null;
          slug: string | null;
          sort: number | null;
          status: string | null;
          term_ends_on: string | null;
          term_starts_on: string | null;
          title: string | null;
          title_ne: string | null;
          updated_at: string | null;
          waking_trigger: string | null;
          work: string | null;
        };
        Insert: {
          asks?: string | null;
          created_at?: string | null;
          gives?: string | null;
          holder_name?: string | null;
          how_to_say_yes?: string | null;
          id?: string | null;
          kind?: string | null;
          published?: boolean | null;
          slug?: string | null;
          sort?: number | null;
          status?: string | null;
          term_ends_on?: string | null;
          term_starts_on?: string | null;
          title?: string | null;
          title_ne?: string | null;
          updated_at?: string | null;
          waking_trigger?: string | null;
          work?: string | null;
        };
        Update: {
          asks?: string | null;
          created_at?: string | null;
          gives?: string | null;
          holder_name?: string | null;
          how_to_say_yes?: string | null;
          id?: string | null;
          kind?: string | null;
          published?: boolean | null;
          slug?: string | null;
          sort?: number | null;
          status?: string | null;
          term_ends_on?: string | null;
          term_starts_on?: string | null;
          title?: string | null;
          title_ne?: string | null;
          updated_at?: string | null;
          waking_trigger?: string | null;
          work?: string | null;
        };
        Relationships: [];
      };
      admin_sattal_pieces: {
        Row: {
          about_house: boolean | null;
          agreement_note: string | null;
          agreement_signed_on: string | null;
          author_connected: boolean | null;
          body: Json | null;
          body_ne: Json | null;
          commissioned_note: string | null;
          commissioned_on: string | null;
          created_at: string | null;
          deposit_ref: string | null;
          form: string | null;
          house_connected: boolean | null;
          id: string | null;
          original_language: string | null;
          outside_reader_id: string | null;
          person_id: string | null;
          person_name: string | null;
          piece_number: number | null;
          published_at: string | null;
          reader_accepted_on: string | null;
          relation_declaration: string | null;
          reply_to_piece_id: string | null;
          slug: string | null;
          sources: Json | null;
          status: string | null;
          subject_person_id: string | null;
          subject_work_id: string | null;
          title: string | null;
          title_ne: string | null;
          translation_of: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pieces_outside_reader_id_fkey";
            columns: ["outside_reader_id"];
            isOneToOne: false;
            referencedRelation: "sattal_readers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "pieces_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_reply_to_piece_id_fkey";
            columns: ["reply_to_piece_id"];
            isOneToOne: false;
            referencedRelation: "admin_sattal_pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_reply_to_piece_id_fkey";
            columns: ["reply_to_piece_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_subject_person_id_fkey";
            columns: ["subject_person_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_subject_person_id_fkey";
            columns: ["subject_person_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "pieces_subject_person_id_fkey";
            columns: ["subject_person_id"];
            isOneToOne: false;
            referencedRelation: "wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_subject_work_id_fkey";
            columns: ["subject_work_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_subject_work_id_fkey";
            columns: ["subject_work_id"];
            isOneToOne: false;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_translation_of_fkey";
            columns: ["translation_of"];
            isOneToOne: false;
            referencedRelation: "admin_sattal_pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_translation_of_fkey";
            columns: ["translation_of"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_treasury_accounts: {
        Row: {
          annual_item_id: string | null;
          created_at: string | null;
          gifts_note: string | null;
          id: string | null;
          instruments_note: string | null;
          largest_share_pct: number | null;
          patronage_note: string | null;
          patronage_share_minor: number | null;
          published: boolean | null;
          tithe_base_minor: number | null;
          tithe_minor: number | null;
          updated_at: string | null;
          year_span: string | null;
        };
        Insert: {
          annual_item_id?: string | null;
          created_at?: string | null;
          gifts_note?: string | null;
          id?: string | null;
          instruments_note?: string | null;
          largest_share_pct?: number | null;
          patronage_note?: string | null;
          patronage_share_minor?: number | null;
          published?: boolean | null;
          tithe_base_minor?: number | null;
          tithe_minor?: number | null;
          updated_at?: string | null;
          year_span?: string | null;
        };
        Update: {
          annual_item_id?: string | null;
          created_at?: string | null;
          gifts_note?: string | null;
          id?: string | null;
          instruments_note?: string | null;
          largest_share_pct?: number | null;
          patronage_note?: string | null;
          patronage_share_minor?: number | null;
          published?: boolean | null;
          tithe_base_minor?: number | null;
          tithe_minor?: number | null;
          updated_at?: string | null;
          year_span?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_annual_item_id_fkey";
            columns: ["annual_item_id"];
            isOneToOne: false;
            referencedRelation: "desk_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accounts_annual_item_id_fkey";
            columns: ["annual_item_id"];
            isOneToOne: false;
            referencedRelation: "published_items";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_wall_people: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          formed_by_guild: boolean | null;
          house_split_note: string | null;
          id: string | null;
          name: string | null;
          name_ne: string | null;
          published: boolean | null;
          represented: boolean | null;
          roles: string[] | null;
          slug: string | null;
          statement: string | null;
          statement_ne: string | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
      admin_wall_shows: {
        Row: {
          closed_on: string | null;
          created_at: string | null;
          id: string | null;
          opened_on: string | null;
          published: boolean | null;
          slug: string | null;
          text: string | null;
          text_ne: string | null;
          title: string | null;
          title_ne: string | null;
          updated_at: string | null;
          work_ids: string[] | null;
        };
        Insert: {
          closed_on?: string | null;
          created_at?: string | null;
          id?: string | null;
          opened_on?: string | null;
          published?: boolean | null;
          slug?: string | null;
          text?: string | null;
          text_ne?: string | null;
          title?: string | null;
          title_ne?: string | null;
          updated_at?: string | null;
          work_ids?: never;
        };
        Update: {
          closed_on?: string | null;
          created_at?: string | null;
          id?: string | null;
          opened_on?: string | null;
          published?: boolean | null;
          slug?: string | null;
          text?: string | null;
          text_ne?: string | null;
          title?: string | null;
          title_ne?: string | null;
          updated_at?: string | null;
          work_ids?: never;
        };
        Relationships: [];
      };
      admin_wall_works: {
        Row: {
          availability: string | null;
          created_at: string | null;
          currency: string | null;
          depth_mm: number | null;
          first_showing: boolean | null;
          friends_price_minor: number | null;
          hallmarked: boolean | null;
          height_mm: number | null;
          id: string | null;
          image_licence: string | null;
          may_show_after_sale: boolean | null;
          medium: string | null;
          medium_ne: string | null;
          person_id: string | null;
          person_name: string | null;
          price_minor: number | null;
          provenance_note: string | null;
          published: boolean | null;
          slug: string | null;
          title: string | null;
          title_ne: string | null;
          updated_at: string | null;
          width_mm: number | null;
          work_number: number | null;
          year: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "works_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "works_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "works_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "wall_people";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_work_terms: {
        Row: {
          agreed_on: string | null;
          agreement_kind: string | null;
          agreement_ref: string | null;
          house_split_note: string | null;
          work_id: string | null;
        };
        Insert: {
          agreed_on?: string | null;
          agreement_kind?: string | null;
          agreement_ref?: string | null;
          house_split_note?: string | null;
          work_id?: string | null;
        };
        Update: {
          agreed_on?: string | null;
          agreement_kind?: string | null;
          agreement_ref?: string | null;
          house_split_note?: string | null;
          work_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "work_terms_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: true;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_terms_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: true;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
        ];
      };
      chronicle_lines: {
        Row: {
          corrects_id: string | null;
          id: string | null;
          line: string | null;
          line_on: string | null;
        };
        Insert: {
          corrects_id?: string | null;
          id?: string | null;
          line?: string | null;
          line_on?: string | null;
        };
        Update: {
          corrects_id?: string | null;
          id?: string | null;
          line?: string | null;
          line_on?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chronicle_lines_corrects_id_fkey";
            columns: ["corrects_id"];
            isOneToOne: false;
            referencedRelation: "chronicle_lines";
            referencedColumns: ["id"];
          },
        ];
      };
      commons_assemblies: {
        Row: {
          created_at: string | null;
          held_on: string | null;
          id: string | null;
          motions: Json | null;
          notes: string | null;
          roll_size: number | null;
        };
        Insert: {
          created_at?: string | null;
          held_on?: string | null;
          id?: string | null;
          motions?: never;
          notes?: string | null;
          roll_size?: number | null;
        };
        Update: {
          created_at?: string | null;
          held_on?: string | null;
          id?: string | null;
          motions?: never;
          notes?: string | null;
          roll_size?: number | null;
        };
        Relationships: [];
      };
      commons_register: {
        Row: {
          abroad: boolean | null;
          covenant_said_on: string | null;
          deceased_on: string | null;
          dues_band: string | null;
          name: string | null;
          person_id: string | null;
          release_reason: string | null;
          released_on: string | null;
          rung: string | null;
          rung_since: string | null;
        };
        Insert: {
          abroad?: boolean | null;
          covenant_said_on?: string | null;
          deceased_on?: string | null;
          dues_band?: string | null;
          name?: never;
          person_id?: string | null;
          release_reason?: string | null;
          released_on?: string | null;
          rung?: string | null;
          rung_since?: string | null;
        };
        Update: {
          abroad?: boolean | null;
          covenant_said_on?: string | null;
          deceased_on?: string | null;
          dues_band?: string | null;
          name?: never;
          person_id?: string | null;
          release_reason?: string | null;
          released_on?: string | null;
          rung?: string | null;
          rung_since?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "people_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: true;
            referencedRelation: "my_profile";
            referencedColumns: ["id"];
          },
        ];
      };
      commons_tables_kept: {
        Row: {
          chronicle_line_id: string | null;
          confirmed_on: string | null;
          created_at: string | null;
          held_on: string | null;
          id: string | null;
          kept_by: string | null;
          kept_by_person_id: string | null;
          place: string | null;
        };
        Insert: {
          chronicle_line_id?: string | null;
          confirmed_on?: string | null;
          created_at?: string | null;
          held_on?: string | null;
          id?: string | null;
          kept_by?: never;
          kept_by_person_id?: string | null;
          place?: string | null;
        };
        Update: {
          chronicle_line_id?: string | null;
          confirmed_on?: string | null;
          created_at?: string | null;
          held_on?: string | null;
          id?: string | null;
          kept_by?: never;
          kept_by_person_id?: string | null;
          place?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tables_kept_chronicle_line_id_fkey";
            columns: ["chronicle_line_id"];
            isOneToOne: false;
            referencedRelation: "chronicle_lines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tables_kept_kept_by_person_id_fkey";
            columns: ["kept_by_person_id"];
            isOneToOne: false;
            referencedRelation: "commons_register";
            referencedColumns: ["person_id"];
          },
        ];
      };
      concerns: {
        Row: {
          body: string | null;
          contact: string | null;
          id: string | null;
          submitted_at: string | null;
          writer_name: string | null;
        };
        Insert: {
          body?: string | null;
          contact?: string | null;
          id?: string | null;
          submitted_at?: string | null;
          writer_name?: string | null;
        };
        Update: {
          body?: string | null;
          contact?: string | null;
          id?: string | null;
          submitted_at?: string | null;
          writer_name?: string | null;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          email: string | null;
          full_name: string | null;
          id: string | null;
          kind: string | null;
          message: string | null;
          reviewed: boolean | null;
          reviewed_at: string | null;
          submitted_at: string | null;
          work_id: string | null;
        };
        Insert: {
          email?: string | null;
          full_name?: string | null;
          id?: string | null;
          kind?: string | null;
          message?: string | null;
          reviewed?: boolean | null;
          reviewed_at?: string | null;
          submitted_at?: string | null;
          work_id?: string | null;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          id?: string | null;
          kind?: string | null;
          message?: string | null;
          reviewed?: boolean | null;
          reviewed_at?: string | null;
          submitted_at?: string | null;
          work_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_messages_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_messages_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
        ];
      };
      desk_items: {
        Row: {
          author: string | null;
          author_name: string | null;
          id: string | null;
          published_at: string | null;
          scheduled_for: string | null;
          slug: string | null;
          status: Database["publishing"]["Enums"]["item_status"] | null;
          title: string | null;
          type: Database["publishing"]["Enums"]["item_type"] | null;
          updated_at: string | null;
        };
        Insert: {
          author?: string | null;
          author_name?: never;
          id?: string | null;
          published_at?: string | null;
          scheduled_for?: string | null;
          slug?: string | null;
          status?: Database["publishing"]["Enums"]["item_status"] | null;
          title?: string | null;
          type?: Database["publishing"]["Enums"]["item_type"] | null;
          updated_at?: string | null;
        };
        Update: {
          author?: string | null;
          author_name?: never;
          id?: string | null;
          published_at?: string | null;
          scheduled_for?: string | null;
          slug?: string | null;
          status?: Database["publishing"]["Enums"]["item_status"] | null;
          title?: string | null;
          type?: Database["publishing"]["Enums"]["item_type"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_author_fkey";
            columns: ["author"];
            isOneToOne: false;
            referencedRelation: "my_profile";
            referencedColumns: ["id"];
          },
        ];
      };
      encounters_calendar: {
        Row: {
          ends_on: string | null;
          how_to_turn_up: string | null;
          how_to_turn_up_ne: string | null;
          id: string | null;
          kind: string | null;
          leads_ne: boolean | null;
          place: string | null;
          place_ne: string | null;
          slug: string | null;
          starts_on: string | null;
          title: string | null;
          title_ne: string | null;
        };
        Insert: {
          ends_on?: string | null;
          how_to_turn_up?: string | null;
          how_to_turn_up_ne?: string | null;
          id?: string | null;
          kind?: string | null;
          leads_ne?: boolean | null;
          place?: string | null;
          place_ne?: string | null;
          slug?: string | null;
          starts_on?: string | null;
          title?: string | null;
          title_ne?: string | null;
        };
        Update: {
          ends_on?: string | null;
          how_to_turn_up?: string | null;
          how_to_turn_up_ne?: string | null;
          id?: string | null;
          kind?: string | null;
          leads_ne?: boolean | null;
          place?: string | null;
          place_ne?: string | null;
          slug?: string | null;
          starts_on?: string | null;
          title?: string | null;
          title_ne?: string | null;
        };
        Relationships: [];
      };
      glossary_terms: {
        Row: {
          definition: string | null;
          definition_ne: string | null;
          id: string | null;
          kind: string | null;
          slug: string | null;
          term: string | null;
          term_ne: string | null;
        };
        Insert: {
          definition?: string | null;
          definition_ne?: string | null;
          id?: string | null;
          kind?: string | null;
          slug?: string | null;
          term?: string | null;
          term_ne?: string | null;
        };
        Update: {
          definition?: string | null;
          definition_ne?: string | null;
          id?: string | null;
          kind?: string | null;
          slug?: string | null;
          term?: string | null;
          term_ne?: string | null;
        };
        Relationships: [];
      };
      guild_register: {
        Row: {
          destroyed_on: string | null;
          id: string | null;
          mark_description: string | null;
          person_name: string | null;
          person_name_ne: string | null;
          person_slug: string | null;
          registered_on: string | null;
          stage: string | null;
          year_letter: string | null;
        };
        Relationships: [];
      };
      hands: {
        Row: {
          asks: string | null;
          gives: string | null;
          holder_name: string | null;
          how_to_say_yes: string | null;
          id: string | null;
          kind: string | null;
          slug: string | null;
          sort: number | null;
          status: string | null;
          term_ends_on: string | null;
          term_starts_on: string | null;
          title: string | null;
          title_ne: string | null;
          waking_trigger: string | null;
          work: string | null;
        };
        Insert: {
          asks?: string | null;
          gives?: string | null;
          holder_name?: string | null;
          how_to_say_yes?: string | null;
          id?: string | null;
          kind?: string | null;
          slug?: string | null;
          sort?: number | null;
          status?: string | null;
          term_ends_on?: string | null;
          term_starts_on?: string | null;
          title?: string | null;
          title_ne?: string | null;
          waking_trigger?: string | null;
          work?: string | null;
        };
        Update: {
          asks?: string | null;
          gives?: string | null;
          holder_name?: string | null;
          how_to_say_yes?: string | null;
          id?: string | null;
          kind?: string | null;
          slug?: string | null;
          sort?: number | null;
          status?: string | null;
          term_ends_on?: string | null;
          term_starts_on?: string | null;
          title?: string | null;
          title_ne?: string | null;
          waking_trigger?: string | null;
          work?: string | null;
        };
        Relationships: [];
      };
      interactions: {
        Row: {
          created_at: string | null;
          created_by_name: string | null;
          id: string | null;
          occurred_at: string | null;
          relationship_id: string | null;
          summary: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by_name?: never;
          id?: string | null;
          occurred_at?: string | null;
          relationship_id?: string | null;
          summary?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by_name?: never;
          id?: string | null;
          occurred_at?: string | null;
          relationship_id?: string | null;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_relationship_id_fkey";
            columns: ["relationship_id"];
            isOneToOne: false;
            referencedRelation: "relationships";
            referencedColumns: ["id"];
          },
        ];
      };
      media_library: {
        Row: {
          alt: string | null;
          created_at: string | null;
          credit: string | null;
          height: number | null;
          id: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string | null;
          width: number | null;
        };
        Insert: {
          alt?: string | null;
          created_at?: string | null;
          credit?: string | null;
          height?: number | null;
          id?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
          width?: number | null;
        };
        Update: {
          alt?: string | null;
          created_at?: string | null;
          credit?: string | null;
          height?: number | null;
          id?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
          width?: number | null;
        };
        Relationships: [];
      };
      member_directory: {
        Row: {
          display_name: string | null;
          id: string | null;
          joined_on: string | null;
          tier_key: string | null;
        };
        Insert: {
          display_name?: never;
          id?: string | null;
          joined_on?: string | null;
          tier_key?: string | null;
        };
        Update: {
          display_name?: never;
          id?: string | null;
          joined_on?: string | null;
          tier_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "admin_membership_tiers";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "members_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "membership_tiers";
            referencedColumns: ["key"];
          },
        ];
      };
      members: {
        Row: {
          directory_opt_in: boolean | null;
          id: string | null;
          joined_on: string | null;
          member_email: string | null;
          member_name: string | null;
          member_no: string | null;
          status: Database["membership"]["Enums"]["member_status"] | null;
          tier_key: string | null;
        };
        Insert: {
          directory_opt_in?: boolean | null;
          id?: string | null;
          joined_on?: string | null;
          member_email?: never;
          member_name?: never;
          member_no?: string | null;
          status?: Database["membership"]["Enums"]["member_status"] | null;
          tier_key?: string | null;
        };
        Update: {
          directory_opt_in?: boolean | null;
          id?: string | null;
          joined_on?: string | null;
          member_email?: never;
          member_name?: never;
          member_no?: string | null;
          status?: Database["membership"]["Enums"]["member_status"] | null;
          tier_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "admin_membership_tiers";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "members_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "membership_tiers";
            referencedColumns: ["key"];
          },
        ];
      };
      membership_applications: {
        Row: {
          applicant_email: string | null;
          applicant_name: string | null;
          decided_at: string | null;
          decision_notes: string | null;
          id: string | null;
          motivation: string | null;
          status: Database["membership"]["Enums"]["application_status"] | null;
          submitted_at: string | null;
          tier_key: string | null;
        };
        Insert: {
          applicant_email?: never;
          applicant_name?: never;
          decided_at?: string | null;
          decision_notes?: string | null;
          id?: string | null;
          motivation?: string | null;
          status?: Database["membership"]["Enums"]["application_status"] | null;
          submitted_at?: string | null;
          tier_key?: string | null;
        };
        Update: {
          applicant_email?: never;
          applicant_name?: never;
          decided_at?: string | null;
          decision_notes?: string | null;
          id?: string | null;
          motivation?: string | null;
          status?: Database["membership"]["Enums"]["application_status"] | null;
          submitted_at?: string | null;
          tier_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "applications_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "admin_membership_tiers";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "applications_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "membership_tiers";
            referencedColumns: ["key"];
          },
        ];
      };
      membership_tiers: {
        Row: {
          annual_fee_cents: number | null;
          description: string | null;
          description_ne: string | null;
          key: string | null;
          name: string | null;
          name_ne: string | null;
        };
        Insert: {
          annual_fee_cents?: number | null;
          description?: string | null;
          description_ne?: string | null;
          key?: string | null;
          name?: string | null;
          name_ne?: string | null;
        };
        Update: {
          annual_fee_cents?: number | null;
          description?: string | null;
          description_ne?: string | null;
          key?: string | null;
          name?: string | null;
          name_ne?: string | null;
        };
        Relationships: [];
      };
      my_membership: {
        Row: {
          card_issued_at: string | null;
          id: string | null;
          joined_on: string | null;
          member_no: string | null;
          status: Database["membership"]["Enums"]["member_status"] | null;
          tier_key: string | null;
          tier_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "admin_membership_tiers";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "members_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "membership_tiers";
            referencedColumns: ["key"];
          },
        ];
      };
      my_profile: {
        Row: {
          avatar_path: string | null;
          bio: string | null;
          communication_preferences: Json | null;
          display_name: string | null;
          email: string | null;
          full_name: string | null;
          id: string | null;
          locale: string | null;
          phone: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          bio?: string | null;
          communication_preferences?: Json | null;
          display_name?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string | null;
          locale?: string | null;
          phone?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string | null;
          communication_preferences?: Json | null;
          display_name?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string | null;
          locale?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      my_registrations: {
        Row: {
          ends_at: string | null;
          id: string | null;
          program_slug: string | null;
          program_title: string | null;
          registered_at: string | null;
          session_id: string | null;
          starts_at: string | null;
          status: Database["programs"]["Enums"]["registration_status"] | null;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          created_at: string | null;
          id: string | null;
          kind: string | null;
          name: string | null;
          notes: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          kind?: string | null;
          name?: string | null;
          notes?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          kind?: string | null;
          name?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      pigeon_submissions: {
        Row: {
          content: string | null;
          contributor_contact: string | null;
          contributor_name: string | null;
          id: string | null;
          reviewed: boolean | null;
          reviewed_at: string | null;
          submitted_at: string | null;
        };
        Insert: {
          content?: string | null;
          contributor_contact?: string | null;
          contributor_name?: string | null;
          id?: string | null;
          reviewed?: boolean | null;
          reviewed_at?: string | null;
          submitted_at?: string | null;
        };
        Update: {
          content?: string | null;
          contributor_contact?: string | null;
          contributor_name?: string | null;
          id?: string | null;
          reviewed?: boolean | null;
          reviewed_at?: string | null;
          submitted_at?: string | null;
        };
        Relationships: [];
      };
      pledges: {
        Row: {
          acknowledged_at: string | null;
          anonymous: boolean | null;
          id: string | null;
          notes: string | null;
          pledged_amount_cents: number | null;
          pledged_on: string | null;
          received_amount_cents: number | null;
          received_on: string | null;
          relationship_id: string | null;
          subject_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pledges_relationship_id_fkey";
            columns: ["relationship_id"];
            isOneToOne: false;
            referencedRelation: "relationships";
            referencedColumns: ["id"];
          },
        ];
      };
      program_sessions: {
        Row: {
          capacity: number | null;
          ends_at: string | null;
          id: string | null;
          program_id: string | null;
          program_slug: string | null;
          program_title: string | null;
          registered_count: number | null;
          starts_at: string | null;
          status: Database["programs"]["Enums"]["session_status"] | null;
          venue_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "admin_programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ];
      };
      programs: {
        Row: {
          description_item: string | null;
          id: string | null;
          slug: string | null;
          summary: string | null;
          title: string | null;
        };
        Insert: {
          description_item?: string | null;
          id?: string | null;
          slug?: string | null;
          summary?: string | null;
          title?: string | null;
        };
        Update: {
          description_item?: string | null;
          id?: string | null;
          slug?: string | null;
          summary?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "programs_description_item_fkey";
            columns: ["description_item"];
            isOneToOne: false;
            referencedRelation: "desk_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_description_item_fkey";
            columns: ["description_item"];
            isOneToOne: false;
            referencedRelation: "published_items";
            referencedColumns: ["id"];
          },
        ];
      };
      published_items: {
        Row: {
          author_name: string | null;
          deposit_ref: string | null;
          featured_media_alt: string | null;
          featured_media_path: string | null;
          id: string | null;
          published_at: string | null;
          slug: string | null;
          subtitle: string | null;
          subtitle_ne: string | null;
          summary: string | null;
          summary_ne: string | null;
          title: string | null;
          title_ne: string | null;
          type: Database["publishing"]["Enums"]["item_type"] | null;
        };
        Relationships: [];
      };
      record_entries: {
        Row: {
          deposit_number: string | null;
          deposited_at: string | null;
          entry_type: Database["publishing"]["Enums"]["item_type"] | null;
          id: string | null;
          link: string | null;
          provenance: string | null;
          readable_path: string | null;
          title: string | null;
        };
        Insert: {
          deposit_number?: string | null;
          deposited_at?: string | null;
          entry_type?: Database["publishing"]["Enums"]["item_type"] | null;
          id?: string | null;
          link?: string | null;
          provenance?: string | null;
          readable_path?: string | null;
          title?: string | null;
        };
        Update: {
          deposit_number?: string | null;
          deposited_at?: string | null;
          entry_type?: Database["publishing"]["Enums"]["item_type"] | null;
          id?: string | null;
          link?: string | null;
          provenance?: string | null;
          readable_path?: string | null;
          title?: string | null;
        };
        Relationships: [];
      };
      relationships: {
        Row: {
          ended_on: string | null;
          id: string | null;
          kind: string | null;
          notes: string | null;
          org_id: string | null;
          owner_name: string | null;
          person_id: string | null;
          started_on: string | null;
          status: Database["crm"]["Enums"]["relationship_status"] | null;
          subject_name: string | null;
          superseded_by: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "relationships_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "relationships_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "my_profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "relationships_superseded_by_fkey";
            columns: ["superseded_by"];
            isOneToOne: false;
            referencedRelation: "relationships";
            referencedColumns: ["id"];
          },
        ];
      };
      sattal_corrections: {
        Row: {
          added_at: string | null;
          id: string | null;
          note: string | null;
          piece_id: string | null;
        };
        Insert: {
          added_at?: string | null;
          id?: string | null;
          note?: string | null;
          piece_id?: string | null;
        };
        Update: {
          added_at?: string | null;
          id?: string | null;
          note?: string | null;
          piece_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "piece_corrections_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "admin_sattal_pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "piece_corrections_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      sattal_ledger: {
        Row: {
          accepted_on: string | null;
          currency: string | null;
          paid_on: string | null;
          payment_ref: string | null;
          piece_id: string | null;
          rate_minor: number | null;
          slug: string | null;
          title: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rate_ledger_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: true;
            referencedRelation: "admin_sattal_pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rate_ledger_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: true;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      sattal_pieces: {
        Row: {
          about_house: boolean | null;
          body: Json | null;
          body_ne: Json | null;
          deposit_ref: string | null;
          form: string | null;
          id: string | null;
          original_language: string | null;
          outside_reader_name: string | null;
          person_id: string | null;
          person_name: string | null;
          person_name_ne: string | null;
          person_slug: string | null;
          piece_number: number | null;
          published_at: string | null;
          reader_accepted_on: string | null;
          relation_declaration: string | null;
          reply_to_piece_id: string | null;
          slug: string | null;
          sources: Json | null;
          subject_person_id: string | null;
          subject_person_name: string | null;
          subject_person_slug: string | null;
          subject_work_id: string | null;
          subject_work_slug: string | null;
          subject_work_title: string | null;
          title: string | null;
          title_ne: string | null;
          translation_of: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pieces_reply_to_piece_id_fkey";
            columns: ["reply_to_piece_id"];
            isOneToOne: false;
            referencedRelation: "admin_sattal_pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_reply_to_piece_id_fkey";
            columns: ["reply_to_piece_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_subject_person_id_fkey";
            columns: ["subject_person_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_subject_person_id_fkey";
            columns: ["subject_person_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "pieces_subject_person_id_fkey";
            columns: ["subject_person_id"];
            isOneToOne: false;
            referencedRelation: "wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_subject_work_id_fkey";
            columns: ["subject_work_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_subject_work_id_fkey";
            columns: ["subject_work_id"];
            isOneToOne: false;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_translation_of_fkey";
            columns: ["translation_of"];
            isOneToOne: false;
            referencedRelation: "admin_sattal_pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_translation_of_fkey";
            columns: ["translation_of"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      sattal_readers: {
        Row: {
          appointed_on: string | null;
          id: string | null;
          name: string | null;
          note: string | null;
        };
        Insert: {
          appointed_on?: string | null;
          id?: string | null;
          name?: string | null;
          note?: string | null;
        };
        Update: {
          appointed_on?: string | null;
          id?: string | null;
          name?: string | null;
          note?: string | null;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          description: string | null;
          key: string | null;
          updated_at: string | null;
          value: Json | null;
        };
        Insert: {
          description?: string | null;
          key?: string | null;
          updated_at?: string | null;
          value?: Json | null;
        };
        Update: {
          description?: string | null;
          key?: string | null;
          updated_at?: string | null;
          value?: Json | null;
        };
        Relationships: [];
      };
      terms_versions: {
        Row: {
          deposit_ref: string | null;
          kind: string | null;
          published_at: string | null;
          slug: string | null;
          title: string | null;
          version: number | null;
        };
        Insert: {
          deposit_ref?: string | null;
          kind?: never;
          published_at?: string | null;
          slug?: string | null;
          title?: string | null;
          version?: never;
        };
        Update: {
          deposit_ref?: string | null;
          kind?: never;
          published_at?: string | null;
          slug?: string | null;
          title?: string | null;
          version?: never;
        };
        Relationships: [];
      };
      treasury_accounts: {
        Row: {
          concentration_rule_met: boolean | null;
          gifts_note: string | null;
          id: string | null;
          instruments_note: string | null;
          largest_share_pct: number | null;
          patronage_note: string | null;
          patronage_share_minor: number | null;
          tithe_base_minor: number | null;
          tithe_minor: number | null;
          year_span: string | null;
        };
        Insert: {
          concentration_rule_met?: never;
          gifts_note?: string | null;
          id?: string | null;
          instruments_note?: string | null;
          largest_share_pct?: number | null;
          patronage_note?: string | null;
          patronage_share_minor?: number | null;
          tithe_base_minor?: number | null;
          tithe_minor?: number | null;
          year_span?: string | null;
        };
        Update: {
          concentration_rule_met?: never;
          gifts_note?: string | null;
          id?: string | null;
          instruments_note?: string | null;
          largest_share_pct?: number | null;
          patronage_note?: string | null;
          patronage_share_minor?: number | null;
          tithe_base_minor?: number | null;
          tithe_minor?: number | null;
          year_span?: string | null;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          address: string | null;
          capacity: number | null;
          id: string | null;
          name: string | null;
        };
        Insert: {
          address?: string | null;
          capacity?: number | null;
          id?: string | null;
          name?: string | null;
        };
        Update: {
          address?: string | null;
          capacity?: number | null;
          id?: string | null;
          name?: string | null;
        };
        Relationships: [];
      };
      voice_intake: {
        Row: {
          about_name: string | null;
          contact: string | null;
          id: string | null;
          note: string | null;
          place: string | null;
          submitted_at: string | null;
          writer_name: string | null;
        };
        Insert: {
          about_name?: string | null;
          contact?: string | null;
          id?: string | null;
          note?: string | null;
          place?: string | null;
          submitted_at?: string | null;
          writer_name?: string | null;
        };
        Update: {
          about_name?: string | null;
          contact?: string | null;
          id?: string | null;
          note?: string | null;
          place?: string | null;
          submitted_at?: string | null;
          writer_name?: string | null;
        };
        Relationships: [];
      };
      wall_people: {
        Row: {
          active: boolean | null;
          formed_by_guild: boolean | null;
          id: string | null;
          name: string | null;
          name_ne: string | null;
          represented: boolean | null;
          roles: string[] | null;
          slug: string | null;
          statement: string | null;
          statement_ne: string | null;
        };
        Insert: {
          active?: boolean | null;
          formed_by_guild?: boolean | null;
          id?: string | null;
          name?: string | null;
          name_ne?: string | null;
          represented?: boolean | null;
          roles?: string[] | null;
          slug?: string | null;
          statement?: string | null;
          statement_ne?: string | null;
        };
        Update: {
          active?: boolean | null;
          formed_by_guild?: boolean | null;
          id?: string | null;
          name?: string | null;
          name_ne?: string | null;
          represented?: boolean | null;
          roles?: string[] | null;
          slug?: string | null;
          statement?: string | null;
          statement_ne?: string | null;
        };
        Relationships: [];
      };
      wall_person_exhibitions: {
        Row: {
          id: string | null;
          note: string | null;
          person_id: string | null;
          place: string | null;
          title: string | null;
          year: number | null;
        };
        Insert: {
          id?: string | null;
          note?: string | null;
          person_id?: string | null;
          place?: string | null;
          title?: string | null;
          year?: number | null;
        };
        Update: {
          id?: string | null;
          note?: string | null;
          person_id?: string | null;
          place?: string | null;
          title?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "person_exhibitions_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "person_exhibitions_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "person_exhibitions_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "wall_people";
            referencedColumns: ["id"];
          },
        ];
      };
      wall_person_writings: {
        Row: {
          id: string | null;
          person_id: string | null;
          source: string | null;
          title: string | null;
          url: string | null;
          year: number | null;
        };
        Insert: {
          id?: string | null;
          person_id?: string | null;
          source?: string | null;
          title?: string | null;
          url?: string | null;
          year?: number | null;
        };
        Update: {
          id?: string | null;
          person_id?: string | null;
          source?: string | null;
          title?: string | null;
          url?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "person_writings_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "person_writings_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "person_writings_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "wall_people";
            referencedColumns: ["id"];
          },
        ];
      };
      wall_show_works: {
        Row: {
          show_id: string | null;
          work_id: string | null;
        };
        Insert: {
          show_id?: string | null;
          work_id?: string | null;
        };
        Update: {
          show_id?: string | null;
          work_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "show_works_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_shows";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "show_works_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "wall_shows";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "show_works_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "show_works_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
        ];
      };
      wall_shows: {
        Row: {
          closed_on: string | null;
          id: string | null;
          opened_on: string | null;
          slug: string | null;
          text: string | null;
          text_ne: string | null;
          title: string | null;
          title_ne: string | null;
        };
        Insert: {
          closed_on?: string | null;
          id?: string | null;
          opened_on?: string | null;
          slug?: string | null;
          text?: string | null;
          text_ne?: string | null;
          title?: string | null;
          title_ne?: string | null;
        };
        Update: {
          closed_on?: string | null;
          id?: string | null;
          opened_on?: string | null;
          slug?: string | null;
          text?: string | null;
          text_ne?: string | null;
          title?: string | null;
          title_ne?: string | null;
        };
        Relationships: [];
      };
      wall_work_events: {
        Row: {
          id: string | null;
          kind: string | null;
          note: string | null;
          occurred_on: string | null;
          work_id: string | null;
        };
        Insert: {
          id?: string | null;
          kind?: string | null;
          note?: string | null;
          occurred_on?: string | null;
          work_id?: string | null;
        };
        Update: {
          id?: string | null;
          kind?: string | null;
          note?: string | null;
          occurred_on?: string | null;
          work_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "work_events_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_events_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
        ];
      };
      wall_work_images: {
        Row: {
          alt: string | null;
          frame: string | null;
          height: number | null;
          id: string | null;
          original_path: string | null;
          photographer: string | null;
          variants: Json | null;
          width: number | null;
          work_id: string | null;
        };
        Insert: {
          alt?: string | null;
          frame?: string | null;
          height?: number | null;
          id?: string | null;
          original_path?: string | null;
          photographer?: string | null;
          variants?: Json | null;
          width?: number | null;
          work_id?: string | null;
        };
        Update: {
          alt?: string | null;
          frame?: string | null;
          height?: number | null;
          id?: string | null;
          original_path?: string | null;
          photographer?: string | null;
          variants?: Json | null;
          width?: number | null;
          work_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "work_images_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_images_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
        ];
      };
      wall_work_texts: {
        Row: {
          attribution: string | null;
          body: string | null;
          body_ne: string | null;
          id: string | null;
          work_id: string | null;
        };
        Insert: {
          attribution?: string | null;
          body?: string | null;
          body_ne?: string | null;
          id?: string | null;
          work_id?: string | null;
        };
        Update: {
          attribution?: string | null;
          body?: string | null;
          body_ne?: string | null;
          id?: string | null;
          work_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "work_texts_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_texts_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "wall_works";
            referencedColumns: ["id"];
          },
        ];
      };
      wall_works: {
        Row: {
          availability: string | null;
          currency: string | null;
          depth_mm: number | null;
          friends_price_minor: number | null;
          hallmarked: boolean | null;
          height_mm: number | null;
          id: string | null;
          medium: string | null;
          medium_ne: string | null;
          person_active: boolean | null;
          person_formed_by_guild: boolean | null;
          person_id: string | null;
          person_name: string | null;
          person_name_ne: string | null;
          person_slug: string | null;
          price_minor: number | null;
          provenance_note: string | null;
          slug: string | null;
          title: string | null;
          title_ne: string | null;
          width_mm: number | null;
          work_number: number | null;
          year: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "works_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "admin_wall_people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "works_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "sattal_pieces";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "works_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "wall_people";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      accept_membership_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      acknowledge_pledge: { Args: { p_id: string }; Returns: undefined };
      add_chronicle_line: {
        Args: { p_corrects?: string; p_line: string; p_on: string };
        Returns: string;
      };
      add_item_comment: {
        Args: {
          p_anchor_text: string;
          p_block_index: number;
          p_body: string;
          p_item: string;
        };
        Returns: Database["publishing"]["Tables"]["item_comments"]["Row"];
        SetofOptions: {
          from: "*";
          to: "item_comments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      add_person_exhibition: {
        Args: {
          p_note: string;
          p_person: string;
          p_place: string;
          p_title: string;
          p_year: number;
        };
        Returns: string;
      };
      add_person_writing: {
        Args: {
          p_person: string;
          p_source: string;
          p_title: string;
          p_url: string;
          p_year: number;
        };
        Returns: string;
      };
      add_sattal_correction: {
        Args: { p_note: string; p_piece: string };
        Returns: string;
      };
      add_work_event: {
        Args: {
          p_kind: string;
          p_note: string;
          p_occurred_on: string;
          p_work: string;
        };
        Returns: string;
      };
      add_work_text: {
        Args: {
          p_attribution: string;
          p_body: string;
          p_body_ne: string;
          p_work: string;
        };
        Returns: string;
      };
      assembly_readiness: {
        Args: never;
        Returns: {
          adopted_on: string;
          denizens: number;
          five_years_on: string;
          ready: boolean;
        }[];
      };
      autosave_item: {
        Args: {
          p_body: Json;
          p_body_ne: Json;
          p_id: string;
          p_title: string;
          p_title_ne: string;
        };
        Returns: undefined;
      };
      brief_begin_send: { Args: { p_item: string }; Returns: undefined };
      brief_confirm: { Args: { p_token: string }; Returns: boolean };
      brief_recipients: {
        Args: never;
        Returns: {
          email: string;
          unsubscribe_token: string;
        }[];
      };
      brief_record_send: {
        Args: { p_count: number; p_item: string };
        Returns: undefined;
      };
      brief_subscribe: {
        Args: { p_email: string };
        Returns: {
          already_confirmed: boolean;
          confirm_token: string;
        }[];
      };
      brief_unsubscribe: { Args: { p_token: string }; Returns: boolean };
      cancel_my_registration: {
        Args: { p_registration: string };
        Returns: undefined;
      };
      check_rate_limit: {
        Args: {
          p_endpoint: string;
          p_ip_hash: string;
          p_max_count?: number;
          p_window_minutes?: number;
        };
        Returns: boolean;
      };
      concurrence_roll: {
        Args: { p_year: number };
        Returns: {
          folds_into_assembly: boolean;
          name: string;
          person_id: string;
          roll_size: number;
        }[];
      };
      confirm_table_kept: { Args: { p_id: string }; Returns: string };
      create_correction: { Args: { p_original: string }; Returns: string };
      decide_membership_application: {
        Args: { p_application: string; p_decision: string; p_notes?: string };
        Returns: Database["membership"]["Enums"]["application_status"];
      };
      deposit_item: {
        Args: { p_id: string };
        Returns: Database["publishing"]["Enums"]["item_status"];
      };
      discard_draft: { Args: { p_id: string }; Returns: undefined };
      editorial_pipeline: {
        Args: never;
        Returns: {
          item_count: number;
          item_type: Database["publishing"]["Enums"]["item_type"];
          status: Database["publishing"]["Enums"]["item_status"];
        }[];
      };
      end_relationship: {
        Args: { p_id: string; p_superseded_by?: string };
        Returns: undefined;
      };
      finance_summary: {
        Args: never;
        Returns: {
          cents: number;
          metric: string;
        }[];
      };
      find_person_by_email: {
        Args: { p_email: string };
        Returns: {
          display_name: string;
          id: string;
        }[];
      };
      get_annual: {
        Args: { p_slug: string };
        Returns: {
          contents: string;
          deposit_ref: string;
          id: string;
          pdf_path: string;
          slug: string;
          superseded_by_slug: string;
          title: string;
          title_ne: string;
          year: number;
        }[];
      };
      get_brief: {
        Args: { p_slug: string };
        Returns: {
          body: Json;
          body_ne: Json;
          deposit_ref: string;
          id: string;
          issue_date: string;
          issue_no: number;
          slug: string;
          superseded_by_slug: string;
          tags: string[];
          title: string;
          title_ne: string;
        }[];
      };
      get_dispatch: {
        Args: { p_slug: string };
        Returns: {
          body: Json;
          body_ne: Json;
          deposit_ref: string;
          id: string;
          issue_date: string;
          issue_no: number;
          slug: string;
          superseded_by_slug: string;
          tags: string[];
          title: string;
          title_ne: string;
        }[];
      };
      get_event: {
        Args: { p_slug: string };
        Returns: {
          body: Json;
          body_ne: Json;
          event_date: string;
          id: string;
          location: string;
          slug: string;
          title: string;
          title_ne: string;
        }[];
      };
      get_item: {
        Args: { p_id: string };
        Returns: {
          author: string;
          author_name: string;
          body: Json;
          body_ne: Json;
          body_schema_version: number;
          deposit_ref: string;
          details: Json;
          featured_media: string;
          featured_media_path: string;
          id: string;
          published_at: string;
          slug: string;
          status: Database["publishing"]["Enums"]["item_status"];
          subtitle: string;
          subtitle_ne: string;
          summary: string;
          summary_ne: string;
          tags: string[];
          title: string;
          title_ne: string;
          type: Database["publishing"]["Enums"]["item_type"];
          updated_at: string;
        }[];
      };
      get_item_revision: {
        Args: { p_id: string };
        Returns: {
          body: Json;
          body_schema_version: number;
          created_at: string;
          created_by_name: string;
          id: string;
          item_id: string;
          kind: string;
          revision_no: number;
          title: string;
        }[];
      };
      get_paper: {
        Args: { p_slug: string };
        Returns: {
          abstract: string;
          body: Json;
          body_ne: Json;
          deposit_ref: string;
          id: string;
          license: string;
          paper_no: number;
          pdf_path: string;
          published_at: string;
          slug: string;
          sources_note: string;
          superseded_by_slug: string;
          tags: string[];
          title: string;
          title_ne: string;
        }[];
      };
      get_pigeon_post: {
        Args: { p_slug: string };
        Returns: {
          deposit_ref: string;
          edition_no: string;
          id: string;
          pdf_path: string;
          slug: string;
          superseded_by_slug: string;
          title: string;
          title_ne: string;
        }[];
      };
      get_published_item: {
        Args: {
          p_slug: string;
          p_type: Database["publishing"]["Enums"]["item_type"];
        };
        Returns: {
          author_name: string;
          body: Json;
          body_ne: Json;
          body_schema_version: number;
          deposit_ref: string;
          featured_media_alt: string;
          featured_media_path: string;
          id: string;
          published_at: string;
          slug: string;
          subtitle: string;
          subtitle_ne: string;
          summary: string;
          summary_ne: string;
          tags: string[];
          title: string;
          title_ne: string;
          type: Database["publishing"]["Enums"]["item_type"];
        }[];
      };
      get_redirect: { Args: { p_path: string }; Returns: string };
      institution_vitals: {
        Args: never;
        Returns: {
          metric: string;
          metric_count: number;
        }[];
      };
      invite_membership_application: {
        Args: { p_application: string };
        Returns: {
          expires_at: string;
          invitation_id: string;
          token: string;
        }[];
      };
      issue_my_card: {
        Args: never;
        Returns: {
          issued_at: string;
          member_no: string;
          token: string;
        }[];
      };
      item_comments: {
        Args: { p_item: string };
        Returns: {
          anchor_text: string;
          author_name: string;
          block_index: number;
          body: string;
          created_at: string;
          id: string;
          resolved_at: string;
          resolved_by_name: string;
        }[];
      };
      item_revisions: {
        Args: { p_item: string };
        Returns: {
          created_at: string;
          created_by_name: string;
          id: string;
          kind: string;
          notes: string;
          revision_no: number;
          title: string;
        }[];
      };
      log_interaction: {
        Args: {
          p_occurred_at?: string;
          p_relationship_id: string;
          p_summary: string;
        };
        Returns: string;
      };
      log_system_event: {
        Args: {
          p_action: string;
          p_context: Json;
          p_entity_id: string;
          p_entity_schema: string;
          p_entity_table: string;
        };
        Returns: undefined;
      };
      mark_attendance: {
        Args: { p_attended: boolean; p_registration: string };
        Returns: Database["programs"]["Enums"]["registration_status"];
      };
      mark_contact_message_reviewed: {
        Args: { p_id: string };
        Returns: undefined;
      };
      mark_pigeon_submission_reviewed: {
        Args: { p_id: string };
        Returns: undefined;
      };
      mark_renewal_notice_sent: {
        Args: { p_notice_kind: string; p_term: string };
        Returns: undefined;
      };
      member_terms: {
        Args: { p_member: string };
        Returns: Database["membership"]["Tables"]["terms"]["Row"][];
        SetofOptions: {
          from: "*";
          to: "terms";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      membership_funnel: {
        Args: never;
        Returns: {
          metric: string;
          metric_count: number;
        }[];
      };
      my_permissions: { Args: never; Returns: string[] };
      my_term: {
        Args: { p_term: string };
        Returns: Database["membership"]["Tables"]["terms"]["Row"];
        SetofOptions: {
          from: "*";
          to: "terms";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      person_timeline: {
        Args: { p_person: string };
        Returns: {
          kind: string;
          occurred_at: string;
          summary: string;
        }[];
      };
      program_fill: {
        Args: never;
        Returns: {
          capacity: number;
          fill_pct: number;
          program_title: string;
          registered_count: number;
          session_id: string;
          starts_at: string;
        }[];
      };
      publish_sattal_piece: { Args: { p_id: string }; Returns: string };
      publish_scheduled_items: {
        Args: never;
        Returns: {
          item_id: string;
          slug: string;
          title: string;
        }[];
      };
      record_dealing_stage: {
        Args: { p_id: string; p_on?: string; p_stage: string };
        Returns: string;
      };
      record_online_payment: {
        Args: {
          p_amount_cents: number;
          p_method: string;
          p_ref: string;
          p_term: string;
        };
        Returns: Database["membership"]["Tables"]["terms"]["Row"];
        SetofOptions: {
          from: "*";
          to: "terms";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_payment: {
        Args: { p_amount_cents: number; p_term: string };
        Returns: boolean;
      };
      record_pledge_receipt: {
        Args: { p_id: string; p_received_amount_cents: number };
        Returns: undefined;
      };
      record_punch_destruction: {
        Args: { p_maker: string; p_note: string; p_on: string };
        Returns: string;
      };
      register_for_session: {
        Args: {
          p_email: string;
          p_full_name: string;
          p_phone: string;
          p_session: string;
        };
        Returns: Database["programs"]["Enums"]["registration_status"];
      };
      register_media: {
        Args: {
          p_alt: string;
          p_credit: string;
          p_height: number;
          p_mime_type: string;
          p_size_bytes: number;
          p_storage_path: string;
          p_width: number;
        };
        Returns: string;
      };
      reissue_membership_invitation: {
        Args: { p_application: string };
        Returns: {
          expires_at: string;
          invitation_id: string;
          token: string;
        }[];
      };
      report_table_kept: {
        Args: { p_held_on: string; p_person: string; p_place: string };
        Returns: string;
      };
      resolve_item_comment: {
        Args: { p_comment: string };
        Returns: Database["publishing"]["Tables"]["item_comments"]["Row"];
        SetofOptions: {
          from: "*";
          to: "item_comments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      restore_item_revision: {
        Args: { p_revision: string };
        Returns: undefined;
      };
      save_annual_details: {
        Args: {
          p_contents: string;
          p_item: string;
          p_pdf_media: string;
          p_year: number;
        };
        Returns: undefined;
      };
      save_assembly: { Args: { p: Json }; Returns: string };
      save_brief_details: {
        Args: { p_issue_date: string; p_item: string };
        Returns: undefined;
      };
      save_commons_person: { Args: { p: Json }; Returns: string };
      save_dealing: { Args: { p: Json }; Returns: string };
      save_dispatch_details: {
        Args: { p_issue_date: string; p_item: string };
        Returns: undefined;
      };
      save_encounter: { Args: { p: Json }; Returns: string };
      save_event_details: {
        Args: { p_event_date: string; p_item: string; p_location: string };
        Returns: undefined;
      };
      save_glossary_term: { Args: { p: Json }; Returns: string };
      save_guild_maker: { Args: { p: Json }; Returns: string };
      save_item: {
        Args: {
          p_body: Json;
          p_body_ne: Json;
          p_featured_media: string;
          p_id: string;
          p_slug: string;
          p_subtitle: string;
          p_subtitle_ne: string;
          p_summary: string;
          p_summary_ne: string;
          p_title: string;
          p_title_ne: string;
          p_type: Database["publishing"]["Enums"]["item_type"];
        };
        Returns: string;
      };
      save_membership_tier: { Args: { p: Json }; Returns: string };
      save_organization: {
        Args: { p_id: string; p_kind: string; p_name: string; p_notes: string };
        Returns: string;
      };
      save_outside_reader: { Args: { p: Json }; Returns: string };
      save_paper_details: {
        Args: {
          p_abstract: string;
          p_item: string;
          p_license: string;
          p_pdf_media: string;
          p_sources_note: string;
        };
        Returns: undefined;
      };
      save_person: { Args: { p: Json }; Returns: string };
      save_pigeon_post_details: {
        Args: { p_edition_no: string; p_item: string; p_pdf_media: string };
        Returns: undefined;
      };
      save_pledge: {
        Args: {
          p_anonymous: boolean;
          p_id: string;
          p_notes: string;
          p_pledged_amount_cents: number;
          p_relationship_id: string;
        };
        Returns: string;
      };
      save_program: {
        Args: {
          p_description_item: string;
          p_id: string;
          p_slug: string;
          p_summary: string;
          p_title: string;
        };
        Returns: string;
      };
      save_relationship: {
        Args: {
          p_id: string;
          p_kind: string;
          p_notes: string;
          p_org_id: string;
          p_owner_person: string;
          p_person_id: string;
        };
        Returns: string;
      };
      save_role: { Args: { p: Json }; Returns: string };
      save_sattal_ledger: { Args: { p: Json }; Returns: string };
      save_sattal_piece: { Args: { p: Json }; Returns: string };
      save_session: {
        Args: {
          p_capacity: number;
          p_ends_at: string;
          p_id: string;
          p_program_id: string;
          p_starts_at: string;
          p_venue_id: string;
        };
        Returns: string;
      };
      save_show: { Args: { p: Json }; Returns: string };
      save_site_wording: {
        Args: { p_en: string; p_key: string; p_ne: string };
        Returns: undefined;
      };
      save_treasury_account: { Args: { p: Json }; Returns: string };
      save_work: { Args: { p: Json }; Returns: string };
      save_work_image: { Args: { p: Json }; Returns: string };
      save_work_terms: { Args: { p: Json }; Returns: string };
      search_everything: {
        Args: { q: string };
        Returns: {
          detail: string;
          kind: string;
          path: string;
          title: string;
        }[];
      };
      search_published: {
        Args: { q: string };
        Returns: {
          author_name: string | null;
          deposit_ref: string | null;
          featured_media_alt: string | null;
          featured_media_path: string | null;
          id: string | null;
          published_at: string | null;
          slug: string | null;
          subtitle: string | null;
          subtitle_ne: string | null;
          summary: string | null;
          summary_ne: string | null;
          title: string | null;
          title_ne: string | null;
          type: Database["publishing"]["Enums"]["item_type"] | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "published_items";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      send_a_pigeon: {
        Args: {
          p_content: string;
          p_contributor_contact: string;
          p_contributor_name: string;
        };
        Returns: undefined;
      };
      session_roster: {
        Args: { p_session: string };
        Returns: {
          person_email: string;
          person_name: string;
          registered_at: string;
          registration_id: string;
          status: Database["programs"]["Enums"]["registration_status"];
        }[];
      };
      set_item_tags: {
        Args: { p_item: string; p_tags: string[] };
        Returns: undefined;
      };
      set_member_status: {
        Args: { p_member: string; p_status: string };
        Returns: Database["membership"]["Enums"]["member_status"];
      };
      site_info: { Args: never; Returns: Json };
      site_wording: {
        Args: never;
        Returns: {
          en: string;
          key: string;
          ne: string;
          updated_at: string;
        }[];
      };
      submit_concern: {
        Args: { p_body: string; p_contact: string; p_writer_name: string };
        Returns: string;
      };
      submit_contact_message: {
        Args: {
          p_email: string;
          p_full_name: string;
          p_message: string;
          p_work_id?: string;
        };
        Returns: string;
      };
      submit_membership_application: {
        Args: {
          p_communication_preferences?: Json;
          p_email: string;
          p_full_name: string;
          p_motivation: string;
          p_phone: string;
          p_tier_key: string;
        };
        Returns: string;
      };
      submit_voice_intake: {
        Args: {
          p_about_name: string;
          p_contact: string;
          p_note: string;
          p_place: string;
          p_writer_name: string;
        };
        Returns: string;
      };
      terms_due_for_renewal_notice: {
        Args: never;
        Returns: {
          email: string;
          ends_on: string;
          full_name: string;
          member_id: string;
          notice_kind: string;
          term_id: string;
          tier_name: string;
        }[];
      };
      transition_item: {
        Args: {
          p_id: string;
          p_notes?: string;
          p_scheduled_for?: string;
          p_to: Database["publishing"]["Enums"]["item_status"];
        };
        Returns: Database["publishing"]["Enums"]["item_status"];
      };
      update_my_directory_opt_in: {
        Args: { p_opt_in: boolean };
        Returns: undefined;
      };
      update_my_profile: {
        Args: {
          p_bio?: string;
          p_communication_preferences?: Json;
          p_display_name?: string;
          p_phone?: string;
        };
        Returns: {
          avatar_path: string | null;
          bio: string | null;
          communication_preferences: Json | null;
          display_name: string | null;
          email: string | null;
          full_name: string | null;
          id: string | null;
          locale: string | null;
          phone: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "my_profile";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_setting: {
        Args: { p_key: string; p_value: Json };
        Returns: undefined;
      };
      verify_member_card: {
        Args: { p_token: string };
        Returns: {
          member_name: string;
          member_no: string;
          status: Database["membership"]["Enums"]["member_status"];
          tier_name: string;
          valid: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  authz: {
    Tables: {
      permissions: {
        Row: {
          description: string | null;
          key: string;
        };
        Insert: {
          description?: string | null;
          key: string;
        };
        Update: {
          description?: string | null;
          key?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission_key: string;
          role_key: string;
        };
        Insert: {
          permission_key: string;
          role_key: string;
        };
        Update: {
          permission_key?: string;
          role_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "role_permissions_role_key_fkey";
            columns: ["role_key"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["key"];
          },
        ];
      };
      roles: {
        Row: {
          description: string | null;
          key: string;
          name: string;
        };
        Insert: {
          description?: string | null;
          key: string;
          name: string;
        };
        Update: {
          description?: string | null;
          key?: string;
          name?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          expires_at: string | null;
          granted_at: string;
          granted_by: string | null;
          person_id: string;
          role_key: string;
        };
        Insert: {
          expires_at?: string | null;
          granted_at?: string;
          granted_by?: string | null;
          person_id: string;
          role_key: string;
        };
        Update: {
          expires_at?: string | null;
          granted_at?: string;
          granted_by?: string | null;
          person_id?: string;
          role_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_role_key_fkey";
            columns: ["role_key"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["key"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_person_id: { Args: never; Returns: string };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      has_permission: { Args: { p_permission: string }; Returns: boolean };
      has_staff_permission: { Args: { p_permission: string }; Returns: boolean };
      session_aal: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  commons: {
    Tables: {
      assemblies: {
        Row: {
          created_at: string;
          held_on: string;
          id: string;
          notes: string | null;
          roll_size: number | null;
        };
        Insert: {
          created_at?: string;
          held_on: string;
          id?: string;
          notes?: string | null;
          roll_size?: number | null;
        };
        Update: {
          created_at?: string;
          held_on?: string;
          id?: string;
          notes?: string | null;
          roll_size?: number | null;
        };
        Relationships: [];
      };
      motions: {
        Row: {
          abstentions: number | null;
          amendment_ref: string | null;
          assembly_id: string;
          created_at: string;
          extraordinary: boolean;
          id: string;
          outcome: string | null;
          text: string;
          threshold: string;
          touches_entrenched: boolean;
          votes_against: number | null;
          votes_for: number | null;
        };
        Insert: {
          abstentions?: number | null;
          amendment_ref?: string | null;
          assembly_id: string;
          created_at?: string;
          extraordinary?: boolean;
          id?: string;
          outcome?: string | null;
          text: string;
          threshold: string;
          touches_entrenched?: boolean;
          votes_against?: number | null;
          votes_for?: number | null;
        };
        Update: {
          abstentions?: number | null;
          amendment_ref?: string | null;
          assembly_id?: string;
          created_at?: string;
          extraordinary?: boolean;
          id?: string;
          outcome?: string | null;
          text?: string;
          threshold?: string;
          touches_entrenched?: boolean;
          votes_against?: number | null;
          votes_for?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "motions_assembly_id_fkey";
            columns: ["assembly_id"];
            isOneToOne: false;
            referencedRelation: "assemblies";
            referencedColumns: ["id"];
          },
        ];
      };
      people: {
        Row: {
          abroad: boolean;
          covenant_said_on: string | null;
          deceased_on: string | null;
          dues_band: string | null;
          person_id: string;
          release_reason: string | null;
          released_on: string | null;
          rung: string;
          rung_since: string;
        };
        Insert: {
          abroad?: boolean;
          covenant_said_on?: string | null;
          deceased_on?: string | null;
          dues_band?: string | null;
          person_id: string;
          release_reason?: string | null;
          released_on?: string | null;
          rung: string;
          rung_since?: string;
        };
        Update: {
          abroad?: boolean;
          covenant_said_on?: string | null;
          deceased_on?: string | null;
          dues_band?: string | null;
          person_id?: string;
          release_reason?: string | null;
          released_on?: string | null;
          rung?: string;
          rung_since?: string;
        };
        Relationships: [];
      };
      tables_kept: {
        Row: {
          chronicle_line_id: string | null;
          confirmed_on: string | null;
          created_at: string;
          held_on: string;
          id: string;
          kept_by_person_id: string;
          place: string | null;
        };
        Insert: {
          chronicle_line_id?: string | null;
          confirmed_on?: string | null;
          created_at?: string;
          held_on: string;
          id?: string;
          kept_by_person_id: string;
          place?: string | null;
        };
        Update: {
          chronicle_line_id?: string | null;
          confirmed_on?: string | null;
          created_at?: string;
          held_on?: string;
          id?: string;
          kept_by_person_id?: string;
          place?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tables_kept_kept_by_person_id_fkey";
            columns: ["kept_by_person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["person_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  crm: {
    Tables: {
      concerns: {
        Row: {
          body: string;
          contact: string | null;
          id: string;
          submitted_at: string;
          writer_name: string | null;
        };
        Insert: {
          body: string;
          contact?: string | null;
          id?: string;
          submitted_at?: string;
          writer_name?: string | null;
        };
        Update: {
          body?: string;
          contact?: string | null;
          id?: string;
          submitted_at?: string;
          writer_name?: string | null;
        };
        Relationships: [];
      };
      interactions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          occurred_at: string;
          relationship_id: string;
          summary: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          occurred_at?: string;
          relationship_id: string;
          summary: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          occurred_at?: string;
          relationship_id?: string;
          summary?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_relationship_id_fkey";
            columns: ["relationship_id"];
            isOneToOne: false;
            referencedRelation: "relationships";
            referencedColumns: ["id"];
          },
        ];
      };
      org_people: {
        Row: {
          org_id: string;
          person_id: string;
          role: string | null;
        };
        Insert: {
          org_id: string;
          person_id: string;
          role?: string | null;
        };
        Update: {
          org_id?: string;
          person_id?: string;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "org_people_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          kind: string | null;
          name: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: string | null;
          name: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string | null;
          name?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      pledges: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          anonymous: boolean;
          created_at: string;
          id: string;
          notes: string | null;
          pledged_amount_cents: number;
          pledged_on: string;
          received_amount_cents: number | null;
          received_on: string | null;
          relationship_id: string;
          updated_at: string;
        };
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          anonymous?: boolean;
          created_at?: string;
          id?: string;
          notes?: string | null;
          pledged_amount_cents: number;
          pledged_on?: string;
          received_amount_cents?: number | null;
          received_on?: string | null;
          relationship_id: string;
          updated_at?: string;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          anonymous?: boolean;
          created_at?: string;
          id?: string;
          notes?: string | null;
          pledged_amount_cents?: number;
          pledged_on?: string;
          received_amount_cents?: number | null;
          received_on?: string | null;
          relationship_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pledges_relationship_id_fkey";
            columns: ["relationship_id"];
            isOneToOne: false;
            referencedRelation: "relationships";
            referencedColumns: ["id"];
          },
        ];
      };
      relationships: {
        Row: {
          created_at: string;
          ended_on: string | null;
          id: string;
          kind: string;
          notes: string | null;
          org_id: string | null;
          owner_person: string | null;
          person_id: string | null;
          started_on: string;
          status: Database["crm"]["Enums"]["relationship_status"];
          superseded_by: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ended_on?: string | null;
          id?: string;
          kind: string;
          notes?: string | null;
          org_id?: string | null;
          owner_person?: string | null;
          person_id?: string | null;
          started_on?: string;
          status?: Database["crm"]["Enums"]["relationship_status"];
          superseded_by?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ended_on?: string | null;
          id?: string;
          kind?: string;
          notes?: string | null;
          org_id?: string | null;
          owner_person?: string | null;
          person_id?: string | null;
          started_on?: string;
          status?: Database["crm"]["Enums"]["relationship_status"];
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "relationships_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "relationships_superseded_by_fkey";
            columns: ["superseded_by"];
            isOneToOne: false;
            referencedRelation: "relationships";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_intake: {
        Row: {
          about_name: string | null;
          contact: string;
          id: string;
          note: string | null;
          place: string | null;
          submitted_at: string;
          writer_name: string;
        };
        Insert: {
          about_name?: string | null;
          contact: string;
          id?: string;
          note?: string | null;
          place?: string | null;
          submitted_at?: string;
          writer_name: string;
        };
        Update: {
          about_name?: string | null;
          contact?: string;
          id?: string;
          note?: string | null;
          place?: string | null;
          submitted_at?: string;
          writer_name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      relationship_status: "active" | "ended";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  encounters: {
    Tables: {
      events: {
        Row: {
          created_at: string;
          ends_on: string | null;
          how_to_turn_up: string | null;
          how_to_turn_up_ne: string | null;
          id: string;
          kind: string;
          leads_ne: boolean;
          place: string | null;
          place_ne: string | null;
          published: boolean;
          slug: string;
          starts_on: string;
          title: string;
          title_ne: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_on?: string | null;
          how_to_turn_up?: string | null;
          how_to_turn_up_ne?: string | null;
          id?: string;
          kind: string;
          leads_ne?: boolean;
          place?: string | null;
          place_ne?: string | null;
          published?: boolean;
          slug: string;
          starts_on: string;
          title: string;
          title_ne?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string | null;
          how_to_turn_up?: string | null;
          how_to_turn_up_ne?: string | null;
          id?: string;
          kind?: string;
          leads_ne?: boolean;
          place?: string | null;
          place_ne?: string | null;
          published?: boolean;
          slug?: string;
          starts_on?: string;
          title?: string;
          title_ne?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  governance: {
    Tables: {
      roles: {
        Row: {
          asks: string | null;
          created_at: string;
          gives: string | null;
          holder_name: string | null;
          how_to_say_yes: string | null;
          id: string;
          kind: string;
          published: boolean;
          slug: string;
          sort: number;
          status: string;
          term_ends_on: string | null;
          term_starts_on: string | null;
          title: string;
          title_ne: string | null;
          updated_at: string;
          waking_trigger: string | null;
          work: string | null;
        };
        Insert: {
          asks?: string | null;
          created_at?: string;
          gives?: string | null;
          holder_name?: string | null;
          how_to_say_yes?: string | null;
          id?: string;
          kind?: string;
          published?: boolean;
          slug: string;
          sort?: number;
          status?: string;
          term_ends_on?: string | null;
          term_starts_on?: string | null;
          title: string;
          title_ne?: string | null;
          updated_at?: string;
          waking_trigger?: string | null;
          work?: string | null;
        };
        Update: {
          asks?: string | null;
          created_at?: string;
          gives?: string | null;
          holder_name?: string | null;
          how_to_say_yes?: string | null;
          id?: string;
          kind?: string;
          published?: boolean;
          slug?: string;
          sort?: number;
          status?: string;
          term_ends_on?: string | null;
          term_starts_on?: string | null;
          title?: string;
          title_ne?: string | null;
          updated_at?: string;
          waking_trigger?: string | null;
          work?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  guild: {
    Tables: {
      makers: {
        Row: {
          created_at: string;
          id: string;
          mark_description: string | null;
          person_id: string;
          presented_on: string | null;
          published: boolean;
          registered_on: string | null;
          stage: string;
          updated_at: string;
          year_letter: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mark_description?: string | null;
          person_id: string;
          presented_on?: string | null;
          published?: boolean;
          registered_on?: string | null;
          stage: string;
          updated_at?: string;
          year_letter?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          mark_description?: string | null;
          person_id?: string;
          presented_on?: string | null;
          published?: boolean;
          registered_on?: string | null;
          stage?: string;
          updated_at?: string;
          year_letter?: string | null;
        };
        Relationships: [];
      };
      punch_destructions: {
        Row: {
          destroyed_on: string;
          id: string;
          maker_id: string;
          note: string | null;
          recorded_at: string;
        };
        Insert: {
          destroyed_on: string;
          id?: string;
          maker_id: string;
          note?: string | null;
          recorded_at?: string;
        };
        Update: {
          destroyed_on?: string;
          id?: string;
          maker_id?: string;
          note?: string | null;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "punch_destructions_maker_id_fkey";
            columns: ["maker_id"];
            isOneToOne: false;
            referencedRelation: "makers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  identity: {
    Tables: {
      people: {
        Row: {
          auth_user_id: string | null;
          avatar_path: string | null;
          bio: string | null;
          communication_preferences: Json;
          created_at: string;
          deceased_at: string | null;
          display_name: string | null;
          email: string | null;
          erased_at: string | null;
          full_name: string;
          id: string;
          locale: string;
          merged_into: string | null;
          phone: string | null;
          source: string;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          communication_preferences?: Json;
          created_at?: string;
          deceased_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          erased_at?: string | null;
          full_name: string;
          id?: string;
          locale?: string;
          merged_into?: string | null;
          phone?: string | null;
          source?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          communication_preferences?: Json;
          created_at?: string;
          deceased_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          erased_at?: string | null;
          full_name?: string;
          id?: string;
          locale?: string;
          merged_into?: string | null;
          phone?: string | null;
          source?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_merged_into_fkey";
            columns: ["merged_into"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      canonical_person: { Args: { p_person: string }; Returns: string };
      display_name: { Args: { p_person: string }; Returns: string };
      email_for: { Args: { p_person: string }; Returns: string };
      erase_person: {
        Args: { p_actor: string; p_person: string };
        Returns: undefined;
      };
      merge_people: {
        Args: { p_actor: string; p_duplicate: string; p_survivor: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  mail: {
    Tables: {
      brief_sends: {
        Row: {
          item_id: string;
          recipient_count: number;
          sent_at: string;
        };
        Insert: {
          item_id: string;
          recipient_count: number;
          sent_at?: string;
        };
        Update: {
          item_id?: string;
          recipient_count?: number;
          sent_at?: string;
        };
        Relationships: [];
      };
      subscribers: {
        Row: {
          confirm_token: string;
          confirmed_at: string | null;
          email: string;
          id: string;
          requested_at: string;
          status: string;
          unsubscribe_token: string;
          unsubscribed_at: string | null;
        };
        Insert: {
          confirm_token?: string;
          confirmed_at?: string | null;
          email: string;
          id?: string;
          requested_at?: string;
          status?: string;
          unsubscribe_token?: string;
          unsubscribed_at?: string | null;
        };
        Update: {
          confirm_token?: string;
          confirmed_at?: string | null;
          email?: string;
          id?: string;
          requested_at?: string;
          status?: string;
          unsubscribe_token?: string;
          unsubscribed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  membership: {
    Tables: {
      applications: {
        Row: {
          decided_at: string | null;
          decided_by: string | null;
          decision_notes: string | null;
          id: string;
          motivation: string | null;
          person_id: string;
          status: Database["membership"]["Enums"]["application_status"];
          submitted_at: string;
          tier_key: string;
        };
        Insert: {
          decided_at?: string | null;
          decided_by?: string | null;
          decision_notes?: string | null;
          id?: string;
          motivation?: string | null;
          person_id: string;
          status?: Database["membership"]["Enums"]["application_status"];
          submitted_at?: string;
          tier_key: string;
        };
        Update: {
          decided_at?: string | null;
          decided_by?: string | null;
          decision_notes?: string | null;
          id?: string;
          motivation?: string | null;
          person_id?: string;
          status?: Database["membership"]["Enums"]["application_status"];
          submitted_at?: string;
          tier_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["key"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          application_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          application_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          id?: string;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          application_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: true;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          card_issued_at: string | null;
          card_token_hash: string | null;
          created_at: string;
          directory_opt_in: boolean;
          id: string;
          joined_on: string;
          member_no: string;
          person_id: string;
          status: Database["membership"]["Enums"]["member_status"];
          tier_key: string;
          updated_at: string;
        };
        Insert: {
          card_issued_at?: string | null;
          card_token_hash?: string | null;
          created_at?: string;
          directory_opt_in?: boolean;
          id?: string;
          joined_on?: string;
          member_no: string;
          person_id: string;
          status?: Database["membership"]["Enums"]["member_status"];
          tier_key: string;
          updated_at?: string;
        };
        Update: {
          card_issued_at?: string | null;
          card_token_hash?: string | null;
          created_at?: string;
          directory_opt_in?: boolean;
          id?: string;
          joined_on?: string;
          member_no?: string;
          person_id?: string;
          status?: Database["membership"]["Enums"]["member_status"];
          tier_key?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["key"];
          },
        ];
      };
      terms: {
        Row: {
          amount_cents: number;
          created_at: string;
          ends_on: string;
          id: string;
          member_id: string;
          paid_at: string | null;
          payment_method: string | null;
          payment_ref: string | null;
          recorded_by: string | null;
          renewal_notice_30d_sent_at: string | null;
          renewal_notice_7d_sent_at: string | null;
          starts_on: string;
          tier_key: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          ends_on: string;
          id?: string;
          member_id: string;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_ref?: string | null;
          recorded_by?: string | null;
          renewal_notice_30d_sent_at?: string | null;
          renewal_notice_7d_sent_at?: string | null;
          starts_on: string;
          tier_key: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          ends_on?: string;
          id?: string;
          member_id?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_ref?: string | null;
          recorded_by?: string | null;
          renewal_notice_30d_sent_at?: string | null;
          renewal_notice_7d_sent_at?: string | null;
          starts_on?: string;
          tier_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "terms_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "terms_tier_key_fkey";
            columns: ["tier_key"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["key"];
          },
        ];
      };
      tiers: {
        Row: {
          active: boolean;
          annual_fee_cents: number;
          description: string | null;
          description_ne: string | null;
          key: string;
          name: string;
          name_ne: string | null;
        };
        Insert: {
          active?: boolean;
          annual_fee_cents: number;
          description?: string | null;
          description_ne?: string | null;
          key: string;
          name: string;
          name_ne?: string | null;
        };
        Update: {
          active?: boolean;
          annual_fee_cents?: number;
          description?: string | null;
          description_ne?: string | null;
          key?: string;
          name?: string;
          name_ne?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string };
      decide_application: {
        Args: {
          p_application: string;
          p_decision: Database["membership"]["Enums"]["application_status"];
          p_notes?: string;
        };
        Returns: {
          decided_at: string | null;
          decided_by: string | null;
          decision_notes: string | null;
          id: string;
          motivation: string | null;
          person_id: string;
          status: Database["membership"]["Enums"]["application_status"];
          submitted_at: string;
          tier_key: string;
        };
        SetofOptions: {
          from: "*";
          to: "applications";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      invite_applicant: {
        Args: { p_actor: string; p_application: string };
        Returns: {
          expires_at: string;
          invitation_id: string;
          token: string;
        }[];
      };
      next_member_no: { Args: never; Returns: string };
      record_online_payment: {
        Args: {
          p_amount_cents: number;
          p_method: string;
          p_ref: string;
          p_term: string;
        };
        Returns: {
          amount_cents: number;
          created_at: string;
          ends_on: string;
          id: string;
          member_id: string;
          paid_at: string | null;
          payment_method: string | null;
          payment_ref: string | null;
          recorded_by: string | null;
          renewal_notice_30d_sent_at: string | null;
          renewal_notice_7d_sent_at: string | null;
          starts_on: string;
          tier_key: string;
        };
        SetofOptions: {
          from: "*";
          to: "terms";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_payment: {
        Args: { p_amount_cents: number; p_term: string };
        Returns: {
          amount_cents: number;
          created_at: string;
          ends_on: string;
          id: string;
          member_id: string;
          paid_at: string | null;
          payment_method: string | null;
          payment_ref: string | null;
          recorded_by: string | null;
          renewal_notice_30d_sent_at: string | null;
          renewal_notice_7d_sent_at: string | null;
          starts_on: string;
          tier_key: string;
        };
        SetofOptions: {
          from: "*";
          to: "terms";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reissue_invitation: {
        Args: { p_actor: string; p_application: string };
        Returns: {
          expires_at: string;
          invitation_id: string;
          token: string;
        }[];
      };
      set_member_status: {
        Args: {
          p_member: string;
          p_status: Database["membership"]["Enums"]["member_status"];
        };
        Returns: {
          card_issued_at: string | null;
          card_token_hash: string | null;
          created_at: string;
          directory_opt_in: boolean;
          id: string;
          joined_on: string;
          member_no: string;
          person_id: string;
          status: Database["membership"]["Enums"]["member_status"];
          tier_key: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "members";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      application_status: "pending" | "accepted" | "declined" | "withdrawn" | "invited";
      member_status: "active" | "lapsed" | "paused" | "resigned" | "honorary";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  programs: {
    Tables: {
      programs: {
        Row: {
          active: boolean;
          created_at: string;
          description_item: string | null;
          id: string;
          slug: string;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description_item?: string | null;
          id?: string;
          slug: string;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description_item?: string | null;
          id?: string;
          slug?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          attended_at: string | null;
          id: string;
          person_id: string;
          registered_at: string;
          session_id: string;
          status: Database["programs"]["Enums"]["registration_status"];
        };
        Insert: {
          attended_at?: string | null;
          id?: string;
          person_id: string;
          registered_at?: string;
          session_id: string;
          status?: Database["programs"]["Enums"]["registration_status"];
        };
        Update: {
          attended_at?: string | null;
          id?: string;
          person_id?: string;
          registered_at?: string;
          session_id?: string;
          status?: Database["programs"]["Enums"]["registration_status"];
        };
        Relationships: [
          {
            foreignKeyName: "registrations_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          capacity: number;
          ends_at: string;
          id: string;
          program_id: string;
          starts_at: string;
          status: Database["programs"]["Enums"]["session_status"];
          venue_id: string | null;
        };
        Insert: {
          capacity: number;
          ends_at: string;
          id?: string;
          program_id: string;
          starts_at: string;
          status?: Database["programs"]["Enums"]["session_status"];
          venue_id?: string | null;
        };
        Update: {
          capacity?: number;
          ends_at?: string;
          id?: string;
          program_id?: string;
          starts_at?: string;
          status?: Database["programs"]["Enums"]["session_status"];
          venue_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      venues: {
        Row: {
          address: string | null;
          capacity: number | null;
          id: string;
          name: string;
        };
        Insert: {
          address?: string | null;
          capacity?: number | null;
          id?: string;
          name: string;
        };
        Update: {
          address?: string | null;
          capacity?: number | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancel_registration: {
        Args: { p_registration: string };
        Returns: undefined;
      };
      mark_attendance: {
        Args: { p_attended: boolean; p_registration: string };
        Returns: {
          attended_at: string | null;
          id: string;
          person_id: string;
          registered_at: string;
          session_id: string;
          status: Database["programs"]["Enums"]["registration_status"];
        };
        SetofOptions: {
          from: "*";
          to: "registrations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      register: {
        Args: { p_person: string; p_session: string };
        Returns: {
          attended_at: string | null;
          id: string;
          person_id: string;
          registered_at: string;
          session_id: string;
          status: Database["programs"]["Enums"]["registration_status"];
        };
        SetofOptions: {
          from: "*";
          to: "registrations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      registration_status: "registered" | "waitlisted" | "cancelled" | "attended" | "no_show";
      session_status: "scheduled" | "cancelled" | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  publishing: {
    Tables: {
      annual_details: {
        Row: {
          contents: string | null;
          item_id: string;
          pdf_media: string | null;
          year: number;
        };
        Insert: {
          contents?: string | null;
          item_id: string;
          pdf_media?: string | null;
          year: number;
        };
        Update: {
          contents?: string | null;
          item_id?: string;
          pdf_media?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "annual_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "annual_details_pdf_media_fkey";
            columns: ["pdf_media"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      brief_details: {
        Row: {
          issue_date: string;
          issue_no: number;
          item_id: string;
        };
        Insert: {
          issue_date?: string;
          issue_no?: number;
          item_id: string;
        };
        Update: {
          issue_date?: string;
          issue_no?: number;
          item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brief_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      chronicle_lines: {
        Row: {
          corrects_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          line: string;
          line_on: string;
        };
        Insert: {
          corrects_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          line: string;
          line_on: string;
        };
        Update: {
          corrects_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          line?: string;
          line_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chronicle_lines_corrects_id_fkey";
            columns: ["corrects_id"];
            isOneToOne: false;
            referencedRelation: "chronicle_lines";
            referencedColumns: ["id"];
          },
        ];
      };
      dispatch_details: {
        Row: {
          issue_date: string;
          issue_no: number;
          item_id: string;
        };
        Insert: {
          issue_date?: string;
          issue_no?: number;
          item_id: string;
        };
        Update: {
          issue_date?: string;
          issue_no?: number;
          item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dispatch_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      event_details: {
        Row: {
          event_date: string;
          item_id: string;
          location: string | null;
        };
        Insert: {
          event_date: string;
          item_id: string;
          location?: string | null;
        };
        Update: {
          event_date?: string;
          item_id?: string;
          location?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      glossary_terms: {
        Row: {
          created_at: string;
          definition: string;
          definition_ne: string | null;
          id: string;
          kind: string;
          slug: string;
          term: string;
          term_ne: string | null;
        };
        Insert: {
          created_at?: string;
          definition: string;
          definition_ne?: string | null;
          id?: string;
          kind?: string;
          slug: string;
          term: string;
          term_ne?: string | null;
        };
        Update: {
          created_at?: string;
          definition?: string;
          definition_ne?: string | null;
          id?: string;
          kind?: string;
          slug?: string;
          term?: string;
          term_ne?: string | null;
        };
        Relationships: [];
      };
      item_comments: {
        Row: {
          anchor_text: string;
          author: string;
          block_index: number;
          body: string;
          created_at: string;
          id: string;
          item_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          anchor_text: string;
          author: string;
          block_index: number;
          body: string;
          created_at?: string;
          id?: string;
          item_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          anchor_text?: string;
          author?: string;
          block_index?: number;
          body?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "item_comments_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      item_revisions: {
        Row: {
          body: Json;
          body_schema_version: number;
          created_at: string;
          created_by: string | null;
          id: string;
          item_id: string;
          kind: string;
          notes: string | null;
          revision_no: number;
          title: string;
        };
        Insert: {
          body: Json;
          body_schema_version: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_id: string;
          kind: string;
          notes?: string | null;
          revision_no: number;
          title: string;
        };
        Update: {
          body?: Json;
          body_schema_version?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_id?: string;
          kind?: string;
          notes?: string | null;
          revision_no?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_revisions_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      item_tags: {
        Row: {
          item_id: string;
          tag_id: string;
        };
        Insert: {
          item_id: string;
          tag_id: string;
        };
        Update: {
          item_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          archived_at: string | null;
          author: string;
          body: Json;
          body_ne: Json | null;
          body_schema_version: number;
          created_at: string;
          deleted_at: string | null;
          deposit_ref: string | null;
          featured_media: string | null;
          id: string;
          previous_version_of: string | null;
          published_at: string | null;
          scheduled_for: string | null;
          search_tsv: unknown;
          slug: string;
          status: Database["publishing"]["Enums"]["item_status"];
          subtitle: string | null;
          subtitle_ne: string | null;
          summary: string | null;
          summary_ne: string | null;
          superseded_by: string | null;
          title: string;
          title_ne: string | null;
          type: Database["publishing"]["Enums"]["item_type"];
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          author: string;
          body?: Json;
          body_ne?: Json | null;
          body_schema_version?: number;
          created_at?: string;
          deleted_at?: string | null;
          deposit_ref?: string | null;
          featured_media?: string | null;
          id?: string;
          previous_version_of?: string | null;
          published_at?: string | null;
          scheduled_for?: string | null;
          search_tsv?: unknown;
          slug: string;
          status?: Database["publishing"]["Enums"]["item_status"];
          subtitle?: string | null;
          subtitle_ne?: string | null;
          summary?: string | null;
          summary_ne?: string | null;
          superseded_by?: string | null;
          title: string;
          title_ne?: string | null;
          type: Database["publishing"]["Enums"]["item_type"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          author?: string;
          body?: Json;
          body_ne?: Json | null;
          body_schema_version?: number;
          created_at?: string;
          deleted_at?: string | null;
          deposit_ref?: string | null;
          featured_media?: string | null;
          id?: string;
          previous_version_of?: string | null;
          published_at?: string | null;
          scheduled_for?: string | null;
          search_tsv?: unknown;
          slug?: string;
          status?: Database["publishing"]["Enums"]["item_status"];
          subtitle?: string | null;
          subtitle_ne?: string | null;
          summary?: string | null;
          summary_ne?: string | null;
          superseded_by?: string | null;
          title?: string;
          title_ne?: string | null;
          type?: Database["publishing"]["Enums"]["item_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_featured_media_fkey";
            columns: ["featured_media"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_previous_version_of_fkey";
            columns: ["previous_version_of"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_superseded_by_fkey";
            columns: ["superseded_by"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          alt: string | null;
          created_at: string;
          created_by: string;
          credit: string | null;
          height: number | null;
          id: string;
          mime_type: string;
          size_bytes: number | null;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          alt?: string | null;
          created_at?: string;
          created_by: string;
          credit?: string | null;
          height?: number | null;
          id?: string;
          mime_type: string;
          size_bytes?: number | null;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          alt?: string | null;
          created_at?: string;
          created_by?: string;
          credit?: string | null;
          height?: number | null;
          id?: string;
          mime_type?: string;
          size_bytes?: number | null;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [];
      };
      paper_details: {
        Row: {
          abstract: string | null;
          item_id: string;
          license: string;
          paper_no: number;
          pdf_media: string | null;
          sources_note: string | null;
        };
        Insert: {
          abstract?: string | null;
          item_id: string;
          license: string;
          paper_no?: number;
          pdf_media?: string | null;
          sources_note?: string | null;
        };
        Update: {
          abstract?: string | null;
          item_id?: string;
          license?: string;
          paper_no?: number;
          pdf_media?: string | null;
          sources_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "paper_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_details_pdf_media_fkey";
            columns: ["pdf_media"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      pigeon_post_details: {
        Row: {
          edition_no: string;
          item_id: string;
          pdf_media: string | null;
        };
        Insert: {
          edition_no: string;
          item_id: string;
          pdf_media?: string | null;
        };
        Update: {
          edition_no?: string;
          item_id?: string;
          pdf_media?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pigeon_post_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pigeon_post_details_pdf_media_fkey";
            columns: ["pdf_media"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      pigeon_submissions: {
        Row: {
          content: string;
          contributor_contact: string | null;
          contributor_name: string | null;
          id: string;
          reviewed: boolean;
          reviewed_at: string | null;
          reviewed_by: string | null;
          submitted_at: string;
        };
        Insert: {
          content: string;
          contributor_contact?: string | null;
          contributor_name?: string | null;
          id?: string;
          reviewed?: boolean;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string;
        };
        Update: {
          content?: string;
          contributor_contact?: string | null;
          contributor_name?: string | null;
          id?: string;
          reviewed?: boolean;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string;
        };
        Relationships: [];
      };
      record_entries: {
        Row: {
          deposit_number: string;
          deposited_at: string;
          entry_type: Database["publishing"]["Enums"]["item_type"];
          id: string;
          item_id: string | null;
          link: string;
          provenance: string;
          readable_path: string | null;
          sattal_piece_id: string | null;
          title: string;
        };
        Insert: {
          deposit_number: string;
          deposited_at?: string;
          entry_type: Database["publishing"]["Enums"]["item_type"];
          id?: string;
          item_id?: string | null;
          link: string;
          provenance: string;
          readable_path?: string | null;
          sattal_piece_id?: string | null;
          title: string;
        };
        Update: {
          deposit_number?: string;
          deposited_at?: string;
          entry_type?: Database["publishing"]["Enums"]["item_type"];
          id?: string;
          item_id?: string | null;
          link?: string;
          provenance?: string;
          readable_path?: string | null;
          sattal_piece_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "record_entries_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      redirects: {
        Row: {
          created_at: string;
          new_path: string;
          old_path: string;
        };
        Insert: {
          created_at?: string;
          new_path: string;
          old_path: string;
        };
        Update: {
          created_at?: string;
          new_path?: string;
          old_path?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_item_comment: {
        Args: {
          p_anchor_text: string;
          p_block_index: number;
          p_body: string;
          p_item: string;
        };
        Returns: {
          anchor_text: string;
          author: string;
          block_index: number;
          body: string;
          created_at: string;
          id: string;
          item_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "item_comments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      autosave_item: {
        Args: {
          p_body: Json;
          p_body_ne: Json;
          p_id: string;
          p_title: string;
          p_title_ne: string;
        };
        Returns: undefined;
      };
      body_text: { Args: { p_body: Json }; Returns: string };
      create_correction: { Args: { p_original: string }; Returns: string };
      deposit_item: {
        Args: { p_item: string };
        Returns: {
          archived_at: string | null;
          author: string;
          body: Json;
          body_ne: Json | null;
          body_schema_version: number;
          created_at: string;
          deleted_at: string | null;
          deposit_ref: string | null;
          featured_media: string | null;
          id: string;
          previous_version_of: string | null;
          published_at: string | null;
          scheduled_for: string | null;
          search_tsv: unknown;
          slug: string;
          status: Database["publishing"]["Enums"]["item_status"];
          subtitle: string | null;
          subtitle_ne: string | null;
          summary: string | null;
          summary_ne: string | null;
          superseded_by: string | null;
          title: string;
          title_ne: string | null;
          type: Database["publishing"]["Enums"]["item_type"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      discard_draft: { Args: { p_item: string }; Returns: undefined };
      item_public_path: {
        Args: {
          p_slug: string;
          p_type: Database["publishing"]["Enums"]["item_type"];
        };
        Returns: string;
      };
      next_deposit_ref: { Args: never; Returns: string };
      resolve_item_comment: {
        Args: { p_comment: string };
        Returns: {
          anchor_text: string;
          author: string;
          block_index: number;
          body: string;
          created_at: string;
          id: string;
          item_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "item_comments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_pigeon: {
        Args: {
          p_content: string;
          p_contributor_contact: string;
          p_contributor_name: string;
        };
        Returns: string;
      };
      transition_item: {
        Args: {
          p_item: string;
          p_notes?: string;
          p_scheduled_for?: string;
          p_to: Database["publishing"]["Enums"]["item_status"];
        };
        Returns: {
          archived_at: string | null;
          author: string;
          body: Json;
          body_ne: Json | null;
          body_schema_version: number;
          created_at: string;
          deleted_at: string | null;
          deposit_ref: string | null;
          featured_media: string | null;
          id: string;
          previous_version_of: string | null;
          published_at: string | null;
          scheduled_for: string | null;
          search_tsv: unknown;
          slug: string;
          status: Database["publishing"]["Enums"]["item_status"];
          subtitle: string | null;
          subtitle_ne: string | null;
          summary: string | null;
          summary_ne: string | null;
          superseded_by: string | null;
          title: string;
          title_ne: string | null;
          type: Database["publishing"]["Enums"]["item_type"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      item_status: "draft" | "in_review" | "published" | "archived" | "scheduled";
      item_type:
        | "article"
        | "page"
        | "paper"
        | "dispatch"
        | "pigeon_post"
        | "brief"
        | "annual"
        | "event"
        | "sattal"
        | "terms";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  sattal: {
    Tables: {
      outside_readers: {
        Row: {
          active: boolean;
          appointed_on: string;
          id: string;
          name: string;
          note: string | null;
        };
        Insert: {
          active?: boolean;
          appointed_on?: string;
          id?: string;
          name: string;
          note?: string | null;
        };
        Update: {
          active?: boolean;
          appointed_on?: string;
          id?: string;
          name?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      piece_corrections: {
        Row: {
          added_at: string;
          id: string;
          note: string;
          piece_id: string;
        };
        Insert: {
          added_at?: string;
          id?: string;
          note: string;
          piece_id: string;
        };
        Update: {
          added_at?: string;
          id?: string;
          note?: string;
          piece_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "piece_corrections_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      pieces: {
        Row: {
          about_house: boolean;
          agreement_note: string | null;
          agreement_signed_on: string | null;
          author_connected: boolean;
          body: Json;
          body_ne: Json | null;
          commissioned_note: string | null;
          commissioned_on: string | null;
          created_at: string;
          deposit_ref: string | null;
          form: string;
          id: string;
          original_language: string;
          outside_reader_id: string | null;
          person_id: string;
          piece_number: number | null;
          published_at: string | null;
          reader_accepted_on: string | null;
          relation_declaration: string;
          reply_to_piece_id: string | null;
          slug: string;
          sources: Json;
          status: string;
          subject_person_id: string | null;
          subject_work_id: string | null;
          title: string;
          title_ne: string | null;
          translation_of: string | null;
          updated_at: string;
        };
        Insert: {
          about_house?: boolean;
          agreement_note?: string | null;
          agreement_signed_on?: string | null;
          author_connected?: boolean;
          body?: Json;
          body_ne?: Json | null;
          commissioned_note?: string | null;
          commissioned_on?: string | null;
          created_at?: string;
          deposit_ref?: string | null;
          form: string;
          id?: string;
          original_language: string;
          outside_reader_id?: string | null;
          person_id: string;
          piece_number?: number | null;
          published_at?: string | null;
          reader_accepted_on?: string | null;
          relation_declaration: string;
          reply_to_piece_id?: string | null;
          slug: string;
          sources?: Json;
          status?: string;
          subject_person_id?: string | null;
          subject_work_id?: string | null;
          title: string;
          title_ne?: string | null;
          translation_of?: string | null;
          updated_at?: string;
        };
        Update: {
          about_house?: boolean;
          agreement_note?: string | null;
          agreement_signed_on?: string | null;
          author_connected?: boolean;
          body?: Json;
          body_ne?: Json | null;
          commissioned_note?: string | null;
          commissioned_on?: string | null;
          created_at?: string;
          deposit_ref?: string | null;
          form?: string;
          id?: string;
          original_language?: string;
          outside_reader_id?: string | null;
          person_id?: string;
          piece_number?: number | null;
          published_at?: string | null;
          reader_accepted_on?: string | null;
          relation_declaration?: string;
          reply_to_piece_id?: string | null;
          slug?: string;
          sources?: Json;
          status?: string;
          subject_person_id?: string | null;
          subject_work_id?: string | null;
          title?: string;
          title_ne?: string | null;
          translation_of?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pieces_outside_reader_id_fkey";
            columns: ["outside_reader_id"];
            isOneToOne: false;
            referencedRelation: "outside_readers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_reply_to_piece_id_fkey";
            columns: ["reply_to_piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_translation_of_fkey";
            columns: ["translation_of"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_ledger: {
        Row: {
          accepted_on: string | null;
          currency: string;
          paid_on: string | null;
          payment_ref: string | null;
          piece_id: string;
          rate_minor: number;
        };
        Insert: {
          accepted_on?: string | null;
          currency?: string;
          paid_on?: string | null;
          payment_ref?: string | null;
          piece_id: string;
          rate_minor: number;
        };
        Update: {
          accepted_on?: string | null;
          currency?: string;
          paid_on?: string | null;
          payment_ref?: string | null;
          piece_id?: string;
          rate_minor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rate_ledger_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: true;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_house_connected: {
        Args: { p_about_house: boolean; p_person: string; p_work: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  treasury: {
    Tables: {
      accounts: {
        Row: {
          annual_item_id: string | null;
          created_at: string;
          gifts_note: string | null;
          id: string;
          instruments_note: string | null;
          largest_share_pct: number | null;
          patronage_note: string | null;
          patronage_share_minor: number | null;
          published: boolean;
          tithe_base_minor: number | null;
          tithe_minor: number | null;
          updated_at: string;
          year_span: string;
        };
        Insert: {
          annual_item_id?: string | null;
          created_at?: string;
          gifts_note?: string | null;
          id?: string;
          instruments_note?: string | null;
          largest_share_pct?: number | null;
          patronage_note?: string | null;
          patronage_share_minor?: number | null;
          published?: boolean;
          tithe_base_minor?: number | null;
          tithe_minor?: number | null;
          updated_at?: string;
          year_span: string;
        };
        Update: {
          annual_item_id?: string | null;
          created_at?: string;
          gifts_note?: string | null;
          id?: string;
          instruments_note?: string | null;
          largest_share_pct?: number | null;
          patronage_note?: string | null;
          patronage_share_minor?: number | null;
          published?: boolean;
          tithe_base_minor?: number | null;
          tithe_minor?: number | null;
          updated_at?: string;
          year_span?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  wall: {
    Tables: {
      dealings: {
        Row: {
          accepted_on: string | null;
          arrived_on: string | null;
          buyer_country: string | null;
          buyer_email: string | null;
          buyer_name: string;
          carrier: string | null;
          created_at: string;
          customs_description: string | null;
          declared_value_minor: number | null;
          dispatched_on: string | null;
          enquiry_id: string | null;
          id: string;
          invoice_no: string | null;
          invoiced_on: string | null;
          notes: string | null;
          quote: Json;
          quoted_on: string | null;
          stage: string;
          tracking: string | null;
          updated_at: string;
          work_id: string;
        };
        Insert: {
          accepted_on?: string | null;
          arrived_on?: string | null;
          buyer_country?: string | null;
          buyer_email?: string | null;
          buyer_name: string;
          carrier?: string | null;
          created_at?: string;
          customs_description?: string | null;
          declared_value_minor?: number | null;
          dispatched_on?: string | null;
          enquiry_id?: string | null;
          id?: string;
          invoice_no?: string | null;
          invoiced_on?: string | null;
          notes?: string | null;
          quote?: Json;
          quoted_on?: string | null;
          stage?: string;
          tracking?: string | null;
          updated_at?: string;
          work_id: string;
        };
        Update: {
          accepted_on?: string | null;
          arrived_on?: string | null;
          buyer_country?: string | null;
          buyer_email?: string | null;
          buyer_name?: string;
          carrier?: string | null;
          created_at?: string;
          customs_description?: string | null;
          declared_value_minor?: number | null;
          dispatched_on?: string | null;
          enquiry_id?: string | null;
          id?: string;
          invoice_no?: string | null;
          invoiced_on?: string | null;
          notes?: string | null;
          quote?: Json;
          quoted_on?: string | null;
          stage?: string;
          tracking?: string | null;
          updated_at?: string;
          work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dealings_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
        ];
      };
      people: {
        Row: {
          active: boolean;
          created_at: string;
          formed_by_guild: boolean;
          id: string;
          name: string;
          name_ne: string | null;
          published: boolean;
          represented: boolean;
          roles: string[];
          slug: string;
          statement: string | null;
          statement_ne: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          formed_by_guild?: boolean;
          id?: string;
          name: string;
          name_ne?: string | null;
          published?: boolean;
          represented?: boolean;
          roles?: string[];
          slug: string;
          statement?: string | null;
          statement_ne?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          formed_by_guild?: boolean;
          id?: string;
          name?: string;
          name_ne?: string | null;
          published?: boolean;
          represented?: boolean;
          roles?: string[];
          slug?: string;
          statement?: string | null;
          statement_ne?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      person_exhibitions: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          person_id: string;
          place: string | null;
          title: string;
          year: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          person_id: string;
          place?: string | null;
          title: string;
          year?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          person_id?: string;
          place?: string | null;
          title?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "person_exhibitions_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      person_terms: {
        Row: {
          house_split_note: string | null;
          person_id: string;
        };
        Insert: {
          house_split_note?: string | null;
          person_id: string;
        };
        Update: {
          house_split_note?: string | null;
          person_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "person_terms_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: true;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      person_writings: {
        Row: {
          created_at: string;
          id: string;
          person_id: string;
          source: string;
          title: string;
          url: string | null;
          year: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          person_id: string;
          source: string;
          title: string;
          url?: string | null;
          year?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          person_id?: string;
          source?: string;
          title?: string;
          url?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "person_writings_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      show_works: {
        Row: {
          show_id: string;
          work_id: string;
        };
        Insert: {
          show_id: string;
          work_id: string;
        };
        Update: {
          show_id?: string;
          work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "show_works_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "shows";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "show_works_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
        ];
      };
      shows: {
        Row: {
          closed_on: string | null;
          created_at: string;
          id: string;
          opened_on: string;
          published: boolean;
          slug: string;
          text: string | null;
          text_ne: string | null;
          title: string;
          title_ne: string | null;
          updated_at: string;
        };
        Insert: {
          closed_on?: string | null;
          created_at?: string;
          id?: string;
          opened_on: string;
          published?: boolean;
          slug: string;
          text?: string | null;
          text_ne?: string | null;
          title: string;
          title_ne?: string | null;
          updated_at?: string;
        };
        Update: {
          closed_on?: string | null;
          created_at?: string;
          id?: string;
          opened_on?: string;
          published?: boolean;
          slug?: string;
          text?: string | null;
          text_ne?: string | null;
          title?: string;
          title_ne?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      work_events: {
        Row: {
          id: string;
          kind: string;
          note: string | null;
          occurred_on: string;
          recorded_at: string;
          work_id: string;
        };
        Insert: {
          id?: string;
          kind: string;
          note?: string | null;
          occurred_on: string;
          recorded_at?: string;
          work_id: string;
        };
        Update: {
          id?: string;
          kind?: string;
          note?: string | null;
          occurred_on?: string;
          recorded_at?: string;
          work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_events_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
        ];
      };
      work_images: {
        Row: {
          alt: string;
          created_at: string;
          frame: string;
          height: number;
          id: string;
          original_path: string;
          photographer: string;
          variants: Json;
          width: number;
          work_id: string;
        };
        Insert: {
          alt: string;
          created_at?: string;
          frame: string;
          height: number;
          id?: string;
          original_path: string;
          photographer: string;
          variants?: Json;
          width: number;
          work_id: string;
        };
        Update: {
          alt?: string;
          created_at?: string;
          frame?: string;
          height?: number;
          id?: string;
          original_path?: string;
          photographer?: string;
          variants?: Json;
          width?: number;
          work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_images_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
        ];
      };
      work_terms: {
        Row: {
          agreed_on: string | null;
          agreement_kind: string | null;
          agreement_ref: string | null;
          house_split_note: string | null;
          work_id: string;
        };
        Insert: {
          agreed_on?: string | null;
          agreement_kind?: string | null;
          agreement_ref?: string | null;
          house_split_note?: string | null;
          work_id: string;
        };
        Update: {
          agreed_on?: string | null;
          agreement_kind?: string | null;
          agreement_ref?: string | null;
          house_split_note?: string | null;
          work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_terms_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: true;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
        ];
      };
      work_texts: {
        Row: {
          attribution: string;
          body: string;
          body_ne: string | null;
          created_at: string;
          id: string;
          work_id: string;
        };
        Insert: {
          attribution: string;
          body: string;
          body_ne?: string | null;
          created_at?: string;
          id?: string;
          work_id: string;
        };
        Update: {
          attribution?: string;
          body?: string;
          body_ne?: string | null;
          created_at?: string;
          id?: string;
          work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_texts_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
        ];
      };
      works: {
        Row: {
          availability: string;
          created_at: string;
          currency: string;
          depth_mm: number | null;
          first_showing: boolean;
          friends_price_minor: number | null;
          hallmarked: boolean;
          height_mm: number | null;
          id: string;
          image_licence: string | null;
          may_show_after_sale: boolean;
          medium: string | null;
          medium_ne: string | null;
          person_id: string;
          price_minor: number | null;
          provenance_note: string | null;
          published: boolean;
          slug: string;
          title: string;
          title_ne: string | null;
          updated_at: string;
          width_mm: number | null;
          work_number: number;
          year: number | null;
        };
        Insert: {
          availability?: string;
          created_at?: string;
          currency?: string;
          depth_mm?: number | null;
          first_showing?: boolean;
          friends_price_minor?: number | null;
          hallmarked?: boolean;
          height_mm?: number | null;
          id?: string;
          image_licence?: string | null;
          may_show_after_sale?: boolean;
          medium?: string | null;
          medium_ne?: string | null;
          person_id: string;
          price_minor?: number | null;
          provenance_note?: string | null;
          published?: boolean;
          slug: string;
          title: string;
          title_ne?: string | null;
          updated_at?: string;
          width_mm?: number | null;
          work_number?: number;
          year?: number | null;
        };
        Update: {
          availability?: string;
          created_at?: string;
          currency?: string;
          depth_mm?: number | null;
          first_showing?: boolean;
          friends_price_minor?: number | null;
          hallmarked?: boolean;
          height_mm?: number | null;
          id?: string;
          image_licence?: string | null;
          may_show_after_sale?: boolean;
          medium?: string | null;
          medium_ne?: string | null;
          person_id?: string;
          price_minor?: number | null;
          provenance_note?: string | null;
          published?: boolean;
          slug?: string;
          title?: string;
          title_ne?: string | null;
          updated_at?: string;
          width_mm?: number | null;
          work_number?: number;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "works_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      audit: {
        Args: {
          p_action: string;
          p_actor: string;
          p_after: Json;
          p_before: Json;
          p_id: string;
          p_schema: string;
          p_table: string;
        };
        Returns: undefined;
      };
      require: { Args: { p_permission: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  admin: {
    Enums: {},
  },
  api: {
    Enums: {},
  },
  authz: {
    Enums: {},
  },
  commons: {
    Enums: {},
  },
  crm: {
    Enums: {
      relationship_status: ["active", "ended"],
    },
  },
  encounters: {
    Enums: {},
  },
  governance: {
    Enums: {},
  },
  guild: {
    Enums: {},
  },
  identity: {
    Enums: {},
  },
  mail: {
    Enums: {},
  },
  membership: {
    Enums: {
      application_status: ["pending", "accepted", "declined", "withdrawn", "invited"],
      member_status: ["active", "lapsed", "paused", "resigned", "honorary"],
    },
  },
  programs: {
    Enums: {
      registration_status: ["registered", "waitlisted", "cancelled", "attended", "no_show"],
      session_status: ["scheduled", "cancelled", "completed"],
    },
  },
  publishing: {
    Enums: {
      item_status: ["draft", "in_review", "published", "archived", "scheduled"],
      item_type: [
        "article",
        "page",
        "paper",
        "dispatch",
        "pigeon_post",
        "brief",
        "annual",
        "event",
        "sattal",
        "terms",
      ],
    },
  },
  sattal: {
    Enums: {},
  },
  treasury: {
    Enums: {},
  },
  wall: {
    Enums: {},
  },
} as const;
