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
    };
    Functions: {
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
    Enums: {},
  },
  programs: {
    Enums: {},
  },
  publishing: {
    Enums: {},
  },
} as const;
