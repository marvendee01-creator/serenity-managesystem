export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_cashier_reports: {
        Row: {
          actual_cash: number
          beginning_cash: number
          created_at: string
          denoms: Json | null
          entrance_sales: number
          id: number
          petty_items: Json | null
          report_date: string
        }
        Insert: {
          actual_cash?: number
          beginning_cash?: number
          created_at?: string
          denoms?: Json | null
          entrance_sales?: number
          id?: number
          petty_items?: Json | null
          report_date: string
        }
        Update: {
          actual_cash?: number
          beginning_cash?: number
          created_at?: string
          denoms?: Json | null
          entrance_sales?: number
          id?: number
          petty_items?: Json | null
          report_date?: string
        }
        Relationships: []
      }
      cashier_reports: {
        Row: {
          actual_cash: number
          beginning_cash: number
          cash_over_short: number
          created_at: string
          date: string
          denoms: Json | null
          expected_ending_cash: number
          id: number
          petty_cash: number
          petty_items: Json | null
          sales: number
        }
        Insert: {
          actual_cash?: number
          beginning_cash?: number
          cash_over_short?: number
          created_at?: string
          date: string
          denoms?: Json | null
          expected_ending_cash?: number
          id?: number
          petty_cash?: number
          petty_items?: Json | null
          sales?: number
        }
        Update: {
          actual_cash?: number
          beginning_cash?: number
          cash_over_short?: number
          created_at?: string
          date?: string
          denoms?: Json | null
          expected_ending_cash?: number
          id?: number
          petty_cash?: number
          petty_items?: Json | null
          sales?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          adult_rate_day: number
          adult_rate_night: number
          barkada_room_rate: number
          billiard_rate: number | null
          child_rate_day: number
          child_rate_night: number
          company_address: string | null
          company_name: string | null
          contact_number: string | null
          dart_rate: number | null
          exclusive_fee: number
          id: string
          kids_5_7_rate_day: number | null
          kids_5_7_rate_night: number | null
          kids_8_above_rate_day: number | null
          kids_8_above_rate_night: number | null
          kubo_room_rate: number
          table_rent_rate: number
          tent_rate: number
          tin_number: string | null
          updated_at: string
          videoke_rate: number | null
          volleyball_rate: number | null
        }
        Insert: {
          adult_rate_day?: number
          adult_rate_night?: number
          barkada_room_rate?: number
          billiard_rate?: number | null
          child_rate_day?: number
          child_rate_night?: number
          company_address?: string | null
          company_name?: string | null
          contact_number?: string | null
          dart_rate?: number | null
          exclusive_fee?: number
          id?: string
          kids_5_7_rate_day?: number | null
          kids_5_7_rate_night?: number | null
          kids_8_above_rate_day?: number | null
          kids_8_above_rate_night?: number | null
          kubo_room_rate?: number
          table_rent_rate?: number
          tent_rate?: number
          tin_number?: string | null
          updated_at?: string
          videoke_rate?: number | null
          volleyball_rate?: number | null
        }
        Update: {
          adult_rate_day?: number
          adult_rate_night?: number
          barkada_room_rate?: number
          billiard_rate?: number | null
          child_rate_day?: number
          child_rate_night?: number
          company_address?: string | null
          company_name?: string | null
          contact_number?: string | null
          dart_rate?: number | null
          exclusive_fee?: number
          id?: string
          kids_5_7_rate_day?: number | null
          kids_5_7_rate_night?: number | null
          kids_8_above_rate_day?: number | null
          kids_8_above_rate_night?: number | null
          kubo_room_rate?: number
          table_rent_rate?: number
          tent_rate?: number
          tin_number?: string | null
          updated_at?: string
          videoke_rate?: number | null
          volleyball_rate?: number | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          adults: number
          amount_paid: number
          balance: number | null
          booking_type: string | null
          check_in: string | null
          check_out: string | null
          checkout_time: string | null
          children: number
          comments: string | null
          corkage_fee: number | null
          created_at: string
          customer_name: string | null
          date_settled: string | null
          date_time: string
          default_hours: number | null
          deposit_amount: number | null
          end_time: string | null
          entry_time: string | null
          extend_amount: number | null
          extend_hours: number | null
          extension_fee: number | null
          function_hall_fee: number | null
          game_type: string | null
          id: number
          kids_4_below: number | null
          kids_5_7: number | null
          kids_8_above: number | null
          module: string
          number_of_tables: number | null
          pax: number | null
          payment_method: string
          payment_status: string | null
          rate: number | null
          room_type: string | null
          start_time: string | null
          status: string | null
          total_headcount: number
          tour_type: string | null
          transaction_no: string
        }
        Insert: {
          adults?: number
          amount_paid?: number
          balance?: number | null
          booking_type?: string | null
          check_in?: string | null
          check_out?: string | null
          checkout_time?: string | null
          children?: number
          comments?: string | null
          corkage_fee?: number | null
          created_at?: string
          customer_name?: string | null
          date_settled?: string | null
          date_time?: string
          default_hours?: number | null
          deposit_amount?: number | null
          end_time?: string | null
          entry_time?: string | null
          extend_amount?: number | null
          extend_hours?: number | null
          extension_fee?: number | null
          function_hall_fee?: number | null
          game_type?: string | null
          id?: number
          kids_4_below?: number | null
          kids_5_7?: number | null
          kids_8_above?: number | null
          module: string
          number_of_tables?: number | null
          pax?: number | null
          payment_method?: string
          payment_status?: string | null
          rate?: number | null
          room_type?: string | null
          start_time?: string | null
          status?: string | null
          total_headcount?: number
          tour_type?: string | null
          transaction_no: string
        }
        Update: {
          adults?: number
          amount_paid?: number
          balance?: number | null
          booking_type?: string | null
          check_in?: string | null
          check_out?: string | null
          checkout_time?: string | null
          children?: number
          comments?: string | null
          corkage_fee?: number | null
          created_at?: string
          customer_name?: string | null
          date_settled?: string | null
          date_time?: string
          default_hours?: number | null
          deposit_amount?: number | null
          end_time?: string | null
          entry_time?: string | null
          extend_amount?: number | null
          extend_hours?: number | null
          extension_fee?: number | null
          function_hall_fee?: number | null
          game_type?: string | null
          id?: number
          kids_4_below?: number | null
          kids_5_7?: number | null
          kids_8_above?: number | null
          module?: string
          number_of_tables?: number | null
          pax?: number | null
          payment_method?: string
          payment_status?: string | null
          rate?: number | null
          room_type?: string | null
          start_time?: string | null
          status?: string | null
          total_headcount?: number
          tour_type?: string | null
          transaction_no?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
