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
  api: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
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
      published_items: {
        Row: {
          author_name: string | null;
          featured_media_alt: string | null;
          featured_media_path: string | null;
          id: string | null;
          published_at: string | null;
          slug: string | null;
          subtitle: string | null;
          summary: string | null;
          title: string | null;
          type: Database["publishing"]["Enums"]["item_type"] | null;
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
    };
    Functions: {
      decide_membership_application: {
        Args: { p_application: string; p_decision: string; p_notes?: string };
        Returns: Database["membership"]["Enums"]["application_status"];
      };
      get_item: {
        Args: { p_id: string };
        Returns: {
          author: string;
          author_name: string;
          body: Json;
          body_schema_version: number;
          featured_media: string;
          featured_media_path: string;
          id: string;
          published_at: string;
          slug: string;
          status: Database["publishing"]["Enums"]["item_status"];
          subtitle: string;
          summary: string;
          tags: string[];
          title: string;
          type: Database["publishing"]["Enums"]["item_type"];
          updated_at: string;
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
          body_schema_version: number;
          featured_media_alt: string;
          featured_media_path: string;
          id: string;
          published_at: string;
          slug: string;
          subtitle: string;
          summary: string;
          tags: string[];
          title: string;
          type: Database["publishing"]["Enums"]["item_type"];
        }[];
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
      my_permissions: { Args: never; Returns: string[] };
      record_payment: {
        Args: { p_amount_cents: number; p_term: string };
        Returns: boolean;
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
      save_item: {
        Args: {
          p_body: Json;
          p_featured_media: string;
          p_id: string;
          p_slug: string;
          p_subtitle: string;
          p_summary: string;
          p_title: string;
          p_type: Database["publishing"]["Enums"]["item_type"];
        };
        Returns: string;
      };
      search_published: {
        Args: { q: string };
        Returns: {
          author_name: string | null;
          featured_media_alt: string | null;
          featured_media_path: string | null;
          id: string | null;
          published_at: string | null;
          slug: string | null;
          subtitle: string | null;
          summary: string | null;
          title: string | null;
          type: Database["publishing"]["Enums"]["item_type"] | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "published_items";
          isOneToOne: false;
          isSetofReturn: true;
        };
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
      [_ in never]: never;
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
  hospitality: {
    Tables: {
      [_ in never]: never;
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
      [_ in never]: never;
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
  publishing: {
    Tables: {
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
          body_schema_version: number;
          created_at: string;
          featured_media: string | null;
          id: string;
          published_at: string | null;
          search_tsv: unknown;
          slug: string;
          status: Database["publishing"]["Enums"]["item_status"];
          subtitle: string | null;
          summary: string | null;
          title: string;
          type: Database["publishing"]["Enums"]["item_type"];
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          author: string;
          body?: Json;
          body_schema_version?: number;
          created_at?: string;
          featured_media?: string | null;
          id?: string;
          published_at?: string | null;
          search_tsv?: unknown;
          slug: string;
          status?: Database["publishing"]["Enums"]["item_status"];
          subtitle?: string | null;
          summary?: string | null;
          title: string;
          type: Database["publishing"]["Enums"]["item_type"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          author?: string;
          body?: Json;
          body_schema_version?: number;
          created_at?: string;
          featured_media?: string | null;
          id?: string;
          published_at?: string | null;
          search_tsv?: unknown;
          slug?: string;
          status?: Database["publishing"]["Enums"]["item_status"];
          subtitle?: string | null;
          summary?: string | null;
          title?: string;
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
      transition_item: {
        Args: {
          p_item: string;
          p_to: Database["publishing"]["Enums"]["item_status"];
        };
        Returns: {
          archived_at: string | null;
          author: string;
          body: Json;
          body_schema_version: number;
          created_at: string;
          featured_media: string | null;
          id: string;
          published_at: string | null;
          search_tsv: unknown;
          slug: string;
          status: Database["publishing"]["Enums"]["item_status"];
          subtitle: string | null;
          summary: string | null;
          title: string;
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
      item_type: "article" | "page" | "paper" | "dispatch" | "pigeon_post";
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
  crm: {
    Enums: {},
  },
  hospitality: {
    Enums: {},
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
    Enums: {},
  },
  publishing: {
    Enums: {
      item_status: ["draft", "in_review", "published", "archived"],
      item_type: ["article", "page", "paper", "dispatch", "pigeon_post"],
    },
  },
} as const;
