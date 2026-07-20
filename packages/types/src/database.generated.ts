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
  analytics: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      editorial_pipeline: {
        Args: never;
        Returns: {
          item_count: number;
          item_type: Database["publishing"]["Enums"]["item_type"];
          status: Database["publishing"]["Enums"]["item_status"];
        }[];
      };
      finance_summary: {
        Args: never;
        Returns: {
          cents: number;
          metric: string;
        }[];
      };
      institution_vitals: {
        Args: never;
        Returns: {
          metric: string;
          metric_count: number;
        }[];
      };
      membership_funnel: {
        Args: never;
        Returns: {
          metric: string;
          metric_count: number;
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
      reservation_load: {
        Args: never;
        Returns: {
          cancelled: number;
          completed: number;
          confirmed: number;
          day: string;
          requested: number;
          seated: number;
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
  api: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      admin_menu_items: {
        Row: {
          available: boolean | null;
          currency: string | null;
          description: string | null;
          dietary: Json | null;
          id: string | null;
          name: string | null;
          position: number | null;
          price_cents: number | null;
          section_id: string | null;
        };
        Insert: {
          available?: boolean | null;
          currency?: string | null;
          description?: string | null;
          dietary?: Json | null;
          id?: string | null;
          name?: string | null;
          position?: number | null;
          price_cents?: number | null;
          section_id?: string | null;
        };
        Update: {
          available?: boolean | null;
          currency?: string | null;
          description?: string | null;
          dietary?: Json | null;
          id?: string | null;
          name?: string | null;
          position?: number | null;
          price_cents?: number | null;
          section_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "admin_menu_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "public_menu";
            referencedColumns: ["section_id"];
          },
        ];
      };
      admin_menu_sections: {
        Row: {
          id: string | null;
          menu_id: string | null;
          name: string | null;
          position: number | null;
        };
        Insert: {
          id?: string | null;
          menu_id?: string | null;
          name?: string | null;
          position?: number | null;
        };
        Update: {
          id?: string | null;
          menu_id?: string | null;
          name?: string | null;
          position?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "menu_sections_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "admin_menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_sections_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "public_menu";
            referencedColumns: ["menu_id"];
          },
        ];
      };
      admin_menus: {
        Row: {
          id: string | null;
          name: string | null;
          slug: string | null;
          status: string | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          id?: string | null;
          name?: string | null;
          slug?: string | null;
          status?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          id?: string | null;
          name?: string | null;
          slug?: string | null;
          status?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
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
          member_only: boolean | null;
          slug: string | null;
          summary: string | null;
          title: string | null;
        };
        Insert: {
          active?: boolean | null;
          description_item?: string | null;
          id?: string | null;
          member_only?: boolean | null;
          slug?: string | null;
          summary?: string | null;
          title?: string | null;
        };
        Update: {
          active?: boolean | null;
          description_item?: string | null;
          id?: string | null;
          member_only?: boolean | null;
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
      desk_items: {
        Row: {
          author: string | null;
          author_name: string | null;
          id: string | null;
          published_at: string | null;
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
      desk_reservations: {
        Row: {
          code: string | null;
          duration_minutes: number | null;
          guest_email: string | null;
          guest_name: string | null;
          guest_phone: string | null;
          id: string | null;
          notes: string | null;
          occasion: string | null;
          party_size: number | null;
          starts_at: string | null;
          status: Database["hospitality"]["Enums"]["reservation_status"] | null;
          table_id: string | null;
          table_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
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
            referencedRelation: "membership_tiers";
            referencedColumns: ["key"];
          },
        ];
      };
      membership_tiers: {
        Row: {
          annual_fee_cents: number | null;
          description: string | null;
          key: string | null;
          name: string | null;
        };
        Insert: {
          annual_fee_cents?: number | null;
          description?: string | null;
          key?: string | null;
          name?: string | null;
        };
        Update: {
          annual_fee_cents?: number | null;
          description?: string | null;
          key?: string | null;
          name?: string | null;
        };
        Relationships: [];
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
      my_reservations: {
        Row: {
          code: string | null;
          duration_minutes: number | null;
          guest_name: string | null;
          id: string | null;
          occasion: string | null;
          party_size: number | null;
          starts_at: string | null;
          status: Database["hospitality"]["Enums"]["reservation_status"] | null;
        };
        Insert: {
          code?: string | null;
          duration_minutes?: number | null;
          guest_name?: string | null;
          id?: string | null;
          occasion?: string | null;
          party_size?: number | null;
          starts_at?: string | null;
          status?: Database["hospitality"]["Enums"]["reservation_status"] | null;
        };
        Update: {
          code?: string | null;
          duration_minutes?: number | null;
          guest_name?: string | null;
          id?: string | null;
          occasion?: string | null;
          party_size?: number | null;
          starts_at?: string | null;
          status?: Database["hospitality"]["Enums"]["reservation_status"] | null;
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
          member_only: boolean | null;
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
          member_only: boolean | null;
          slug: string | null;
          summary: string | null;
          title: string | null;
        };
        Insert: {
          description_item?: string | null;
          id?: string | null;
          member_only?: boolean | null;
          slug?: string | null;
          summary?: string | null;
          title?: string | null;
        };
        Update: {
          description_item?: string | null;
          id?: string | null;
          member_only?: boolean | null;
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
      public_menu: {
        Row: {
          currency: string | null;
          dietary: Json | null;
          item_description: string | null;
          item_id: string | null;
          item_name: string | null;
          item_position: number | null;
          menu_id: string | null;
          menu_name: string | null;
          menu_slug: string | null;
          price_cents: number | null;
          section_id: string | null;
          section_name: string | null;
          section_position: number | null;
        };
        Relationships: [];
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
          title: string | null;
        };
        Insert: {
          deposit_number?: string | null;
          deposited_at?: string | null;
          entry_type?: Database["publishing"]["Enums"]["item_type"] | null;
          id?: string | null;
          link?: string | null;
          provenance?: string | null;
          title?: string | null;
        };
        Update: {
          deposit_number?: string | null;
          deposited_at?: string | null;
          entry_type?: Database["publishing"]["Enums"]["item_type"] | null;
          id?: string | null;
          link?: string | null;
          provenance?: string | null;
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
      service_periods: {
        Row: {
          closed: boolean | null;
          closes: string | null;
          id: string | null;
          on_date: string | null;
          opens: string | null;
          seating_interval_minutes: number | null;
          weekday: number | null;
        };
        Insert: {
          closed?: boolean | null;
          closes?: string | null;
          id?: string | null;
          on_date?: string | null;
          opens?: string | null;
          seating_interval_minutes?: number | null;
          weekday?: number | null;
        };
        Update: {
          closed?: boolean | null;
          closes?: string | null;
          id?: string | null;
          on_date?: string | null;
          opens?: string | null;
          seating_interval_minutes?: number | null;
          weekday?: number | null;
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
      tables: {
        Row: {
          active: boolean | null;
          id: string | null;
          name: string | null;
          seats: number | null;
          zone: string | null;
        };
        Insert: {
          active?: boolean | null;
          id?: string | null;
          name?: string | null;
          seats?: number | null;
          zone?: string | null;
        };
        Update: {
          active?: boolean | null;
          id?: string | null;
          name?: string | null;
          seats?: number | null;
          zone?: string | null;
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
    };
    Functions: {
      acknowledge_pledge: { Args: { p_id: string }; Returns: undefined };
      cancel_my_registration: {
        Args: { p_registration: string };
        Returns: undefined;
      };
      cancel_my_reservation: { Args: { p_id: string }; Returns: undefined };
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
      institution_vitals: {
        Args: never;
        Returns: {
          metric: string;
          metric_count: number;
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
      mark_attendance: {
        Args: { p_attended: boolean; p_registration: string };
        Returns: Database["programs"]["Enums"]["registration_status"];
      };
      mark_pigeon_submission_reviewed: {
        Args: { p_id: string };
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
      record_payment: {
        Args: { p_amount_cents: number; p_term: string };
        Returns: boolean;
      };
      record_pledge_receipt: {
        Args: { p_id: string; p_received_amount_cents: number };
        Returns: undefined;
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
      request_reservation: {
        Args: {
          p_duration_minutes: number;
          p_email: string;
          p_full_name: string;
          p_notes: string;
          p_occasion: string;
          p_party_size: number;
          p_phone: string;
          p_starts_at: string;
        };
        Returns: string;
      };
      reservation_load: {
        Args: never;
        Returns: {
          cancelled: number;
          completed: number;
          confirmed: number;
          day: string;
          requested: number;
          seated: number;
        }[];
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
      save_brief_details: {
        Args: { p_issue_date: string; p_item: string };
        Returns: undefined;
      };
      save_dispatch_details: {
        Args: { p_issue_date: string; p_item: string };
        Returns: undefined;
      };
      save_event_details: {
        Args: { p_event_date: string; p_item: string; p_location: string };
        Returns: undefined;
      };
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
      save_menu: {
        Args: {
          p_id: string;
          p_name: string;
          p_slug: string;
          p_status: string;
          p_valid_from: string;
          p_valid_to: string;
        };
        Returns: string;
      };
      save_menu_item: {
        Args: {
          p_available: boolean;
          p_description: string;
          p_dietary: Json;
          p_id: string;
          p_name: string;
          p_position: number;
          p_price_cents: number;
          p_section_id: string;
        };
        Returns: string;
      };
      save_menu_section: {
        Args: {
          p_id: string;
          p_menu_id: string;
          p_name: string;
          p_position: number;
        };
        Returns: string;
      };
      save_organization: {
        Args: { p_id: string; p_kind: string; p_name: string; p_notes: string };
        Returns: string;
      };
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
          p_member_only: boolean;
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
      save_table: {
        Args: {
          p_active: boolean;
          p_id: string;
          p_name: string;
          p_seats: number;
          p_zone: string;
        };
        Returns: string;
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
      set_reservation_status: {
        Args: {
          p_id: string;
          p_status: Database["hospitality"]["Enums"]["reservation_status"];
          p_table_id: string;
        };
        Returns: Database["hospitality"]["Enums"]["reservation_status"];
      };
      site_info: { Args: never; Returns: Json };
      submit_membership_application: {
        Args: {
          p_email: string;
          p_full_name: string;
          p_motivation: string;
          p_phone: string;
          p_tier_key: string;
        };
        Returns: string;
      };
      transition_item: {
        Args: {
          p_id: string;
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
  crm: {
    Tables: {
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
  hospitality: {
    Tables: {
      menu_items: {
        Row: {
          available: boolean;
          currency: string;
          description: string | null;
          dietary: Json;
          id: string;
          name: string;
          position: number;
          price_cents: number | null;
          section_id: string;
        };
        Insert: {
          available?: boolean;
          currency?: string;
          description?: string | null;
          dietary?: Json;
          id?: string;
          name: string;
          position?: number;
          price_cents?: number | null;
          section_id: string;
        };
        Update: {
          available?: boolean;
          currency?: string;
          description?: string | null;
          dietary?: Json;
          id?: string;
          name?: string;
          position?: number;
          price_cents?: number | null;
          section_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "menu_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_sections: {
        Row: {
          id: string;
          menu_id: string;
          name: string;
          position: number;
        };
        Insert: {
          id?: string;
          menu_id: string;
          name: string;
          position?: number;
        };
        Update: {
          id?: string;
          menu_id?: string;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "menu_sections_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id"];
          },
        ];
      };
      menus: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          status?: string;
          updated_at?: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          code: string;
          created_at: string;
          duration_minutes: number;
          guest_email: string | null;
          guest_name: string;
          guest_phone: string | null;
          id: string;
          notes: string | null;
          occasion: string | null;
          party_size: number;
          person_id: string | null;
          starts_at: string;
          status: Database["hospitality"]["Enums"]["reservation_status"];
          table_id: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          duration_minutes?: number;
          guest_email?: string | null;
          guest_name: string;
          guest_phone?: string | null;
          id?: string;
          notes?: string | null;
          occasion?: string | null;
          party_size: number;
          person_id?: string | null;
          starts_at: string;
          status?: Database["hospitality"]["Enums"]["reservation_status"];
          table_id?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          duration_minutes?: number;
          guest_email?: string | null;
          guest_name?: string;
          guest_phone?: string | null;
          id?: string;
          notes?: string | null;
          occasion?: string | null;
          party_size?: number;
          person_id?: string | null;
          starts_at?: string;
          status?: Database["hospitality"]["Enums"]["reservation_status"];
          table_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      service_periods: {
        Row: {
          closed: boolean;
          closes: string;
          id: string;
          on_date: string | null;
          opens: string;
          seating_interval_minutes: number;
          weekday: number | null;
        };
        Insert: {
          closed?: boolean;
          closes: string;
          id?: string;
          on_date?: string | null;
          opens: string;
          seating_interval_minutes?: number;
          weekday?: number | null;
        };
        Update: {
          closed?: boolean;
          closes?: string;
          id?: string;
          on_date?: string | null;
          opens?: string;
          seating_interval_minutes?: number;
          weekday?: number | null;
        };
        Relationships: [];
      };
      tables: {
        Row: {
          active: boolean;
          id: string;
          name: string;
          seats: number;
          zone: string | null;
        };
        Insert: {
          active?: boolean;
          id?: string;
          name: string;
          seats: number;
          zone?: string | null;
        };
        Update: {
          active?: boolean;
          id?: string;
          name?: string;
          seats?: number;
          zone?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      request_reservation: {
        Args: {
          p_duration_minutes: number;
          p_email: string;
          p_full_name: string;
          p_notes: string;
          p_occasion: string;
          p_party_size: number;
          p_phone: string;
          p_starts_at: string;
        };
        Returns: {
          code: string;
          created_at: string;
          duration_minutes: number;
          guest_email: string | null;
          guest_name: string;
          guest_phone: string | null;
          id: string;
          notes: string | null;
          occasion: string | null;
          party_size: number;
          person_id: string | null;
          starts_at: string;
          status: Database["hospitality"]["Enums"]["reservation_status"];
          table_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "reservations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reservation_span: {
        Args: { p_duration_minutes: number; p_starts_at: string };
        Returns: unknown;
      };
      set_reservation_status: {
        Args: {
          p_id: string;
          p_status: Database["hospitality"]["Enums"]["reservation_status"];
          p_table_id: string;
        };
        Returns: {
          code: string;
          created_at: string;
          duration_minutes: number;
          guest_email: string | null;
          guest_name: string;
          guest_phone: string | null;
          id: string;
          notes: string | null;
          occasion: string | null;
          party_size: number;
          person_id: string | null;
          starts_at: string;
          status: Database["hospitality"]["Enums"]["reservation_status"];
          table_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "reservations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      reservation_status:
        "requested" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
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
      members: {
        Row: {
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
          recorded_by: string | null;
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
          recorded_by?: string | null;
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
          recorded_by?: string | null;
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
          key: string;
          name: string;
        };
        Insert: {
          active?: boolean;
          annual_fee_cents: number;
          description?: string | null;
          key: string;
          name: string;
        };
        Update: {
          active?: boolean;
          annual_fee_cents?: number;
          description?: string | null;
          key?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
      next_member_no: { Args: never; Returns: string };
      record_payment: {
        Args: { p_amount_cents: number; p_term: string };
        Returns: {
          amount_cents: number;
          created_at: string;
          ends_on: string;
          id: string;
          member_id: string;
          paid_at: string | null;
          recorded_by: string | null;
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
      set_member_status: {
        Args: {
          p_member: string;
          p_status: Database["membership"]["Enums"]["member_status"];
        };
        Returns: {
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
      application_status: "pending" | "accepted" | "declined" | "withdrawn";
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
          member_only: boolean;
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
          member_only?: boolean;
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
          member_only?: boolean;
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
      item_revisions: {
        Row: {
          body: Json;
          body_schema_version: number;
          created_at: string;
          created_by: string | null;
          id: string;
          item_id: string;
          kind: string;
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
          item_id: string;
          link: string;
          provenance: string;
          title: string;
        };
        Insert: {
          deposit_number: string;
          deposited_at?: string;
          entry_type: Database["publishing"]["Enums"]["item_type"];
          id?: string;
          item_id: string;
          link: string;
          provenance: string;
          title: string;
        };
        Update: {
          deposit_number?: string;
          deposited_at?: string;
          entry_type?: Database["publishing"]["Enums"]["item_type"];
          id?: string;
          item_id?: string;
          link?: string;
          provenance?: string;
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
      next_deposit_ref: { Args: never; Returns: string };
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
      item_status: "draft" | "in_review" | "published" | "archived";
      item_type:
        "article" | "page" | "paper" | "dispatch" | "pigeon_post" | "brief" | "annual" | "event";
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
  analytics: {
    Enums: {},
  },
  api: {
    Enums: {},
  },
  authz: {
    Enums: {},
  },
  crm: {
    Enums: {
      relationship_status: ["active", "ended"],
    },
  },
  hospitality: {
    Enums: {
      reservation_status: ["requested", "confirmed", "seated", "completed", "cancelled", "no_show"],
    },
  },
  identity: {
    Enums: {},
  },
  membership: {
    Enums: {
      application_status: ["pending", "accepted", "declined", "withdrawn"],
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
      item_status: ["draft", "in_review", "published", "archived"],
      item_type: [
        "article",
        "page",
        "paper",
        "dispatch",
        "pigeon_post",
        "brief",
        "annual",
        "event",
      ],
    },
  },
} as const;
