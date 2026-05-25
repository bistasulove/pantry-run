export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      category_overrides: {
        Row: {
          category: string
          created_at: string
          normalised_name: string
          source: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          normalised_name: string
          source: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          normalised_name?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_request_counters: {
        Row: {
          cache_hits: number
          cache_misses: number
          count: number
          day: string
          household_id: string
          updated_at: string
        }
        Insert: {
          cache_hits?: number
          cache_misses?: number
          count?: number
          day: string
          household_id: string
          updated_at?: string
        }
        Update: {
          cache_hits?: number
          cache_misses?: number
          count?: number
          day?: string
          household_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_request_counters_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_category_overrides: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          household_id: string
          normalised_name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          household_id: string
          normalised_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          household_id?: string
          normalised_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_category_overrides_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          display_name: string | null
          household_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          household_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          household_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          code_expires_at: string
          created_at: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          code_expires_at: string
          created_at?: string
          id?: string
          invite_code: string
          name: string
        }
        Update: {
          code_expires_at?: string
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      list_items: {
        Row: {
          added_by: string | null
          added_by_name: string | null
          category: string
          category_pending: boolean
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          is_checked: boolean
          is_recurring: boolean
          list_id: string
          name: string
          note: string | null
          quantity: string | null
          quantity_unit: string | null
          quantity_value: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          added_by_name?: string | null
          category?: string
          category_pending?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean
          is_recurring?: boolean
          list_id: string
          name: string
          note?: string | null
          quantity?: string | null
          quantity_unit?: string | null
          quantity_value?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          added_by_name?: string | null
          category?: string
          category_pending?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean
          is_recurring?: boolean
          list_id?: string
          name?: string
          note?: string | null
          quantity?: string | null
          quantity_unit?: string | null
          quantity_value?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_trip_items: {
        Row: {
          added_by_name: string | null
          category: string
          created_at: string
          id: string
          name: string
          note: string | null
          quantity: string | null
          quantity_unit: string | null
          quantity_value: number | null
          trip_id: string
          was_recurring: boolean
        }
        Insert: {
          added_by_name?: string | null
          category?: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
          quantity?: string | null
          quantity_unit?: string | null
          quantity_value?: number | null
          trip_id: string
          was_recurring?: boolean
        }
        Update: {
          added_by_name?: string | null
          category?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          quantity?: string | null
          quantity_unit?: string | null
          quantity_value?: number | null
          trip_id?: string
          was_recurring?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "shopping_trip_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "shopping_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_trips: {
        Row: {
          finished_at: string
          finished_by: string | null
          household_id: string
          id: string
          item_count: number
          list_id: string | null
        }
        Insert: {
          finished_at?: string
          finished_by?: string | null
          household_id: string
          id?: string
          item_count?: number
          list_id?: string | null
        }
        Update: {
          finished_at?: string
          finished_by?: string | null
          household_id?: string
          id?: string
          item_count?: number
          list_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_trips_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_trips_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household: {
        Args: { p_display_name?: string; p_name: string }
        Returns: Json
      }
      finish_shopping: { Args: { p_list_id: string }; Returns: Json }
      gen_invite_code: { Args: never; Returns: string }
      increment_category_counter: {
        Args: { p_household_id: string; p_kind: string }
        Returns: number
      }
      is_household_member: {
        Args: { p_household_id: string }
        Returns: boolean
      }
      is_household_owner: { Args: { p_household_id: string }; Returns: boolean }
      join_household_by_code: {
        Args: { p_display_name?: string; p_invite_code: string }
        Returns: Json
      }
      leave_household: { Args: { p_new_owner_user_id?: string }; Returns: Json }
      regenerate_invite_code: {
        Args: { p_household_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

