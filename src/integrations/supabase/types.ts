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
      booking_payments: {
        Row: {
          amount: number
          created_at: string
          id: number
          kind: string
          payment_date: string
          transaction_id: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          kind: string
          payment_date: string
          transaction_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          kind?: string
          payment_date?: string
          transaction_id?: number
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
      chart_of_accounts: {
        Row: {
          account_code: string | null
          account_name: string
          account_type: string
          as_of_date: string | null
          beginning_balance: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: number
          subcategory: string | null
        }
        Insert: {
          account_code?: string | null
          account_name: string
          account_type: string
          as_of_date?: string | null
          beginning_balance?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          subcategory?: string | null
        }
        Update: {
          account_code?: string | null
          account_name?: string
          account_type?: string
          as_of_date?: string | null
          beginning_balance?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          subcategory?: string | null
        }
        Relationships: []
      }
      food_inventory: {
        Row: {
          created_at: string
          id: number
          item_description: string | null
          item_name: string
          selling_price: number
          stock_qty: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          item_description?: string | null
          item_name: string
          selling_price?: number
          stock_qty?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          item_description?: string | null
          item_name?: string
          selling_price?: number
          stock_qty?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      food_sales: {
        Row: {
          capital: number
          cash_received: number
          change_amount: number
          commission_share: number
          created_at: string
          customer_name: string | null
          date_time: string
          discount: number
          id: number
          item_id: number | null
          item_name: string
          profit: number
          qty: number
          sale_date: string
          total_sales: number
          unit_price: number
        }
        Insert: {
          capital?: number
          cash_received?: number
          change_amount?: number
          commission_share?: number
          created_at?: string
          customer_name?: string | null
          date_time?: string
          discount?: number
          id?: number
          item_id?: number | null
          item_name: string
          profit?: number
          qty?: number
          sale_date?: string
          total_sales?: number
          unit_price?: number
        }
        Update: {
          capital?: number
          cash_received?: number
          change_amount?: number
          commission_share?: number
          created_at?: string
          customer_name?: string | null
          date_time?: string
          discount?: number
          id?: number
          item_id?: number | null
          item_name?: string
          profit?: number
          qty?: number
          sale_date?: string
          total_sales?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "food_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          account_title: string
          created_at: string | null
          credit: number | null
          debit: number | null
          entry_date: string
          id: number
          memo: string | null
          source_id: string | null
          source_module: string | null
        }
        Insert: {
          account_title: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          entry_date: string
          id?: number
          memo?: string | null
          source_id?: string | null
          source_module?: string | null
        }
        Update: {
          account_title?: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          entry_date?: string
          id?: number
          memo?: string | null
          source_id?: string | null
          source_module?: string | null
        }
        Relationships: []
      }
      serenity_credit_ledger: {
        Row: {
          amount: number
          created_at: string
          id: number
          issue_id: string
          kind: string
          member_id: number
          reason: string
          request_id: string
          staff_user: string | null
          transaction_id: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: never
          issue_id: string
          kind: string
          member_id: number
          reason: string
          request_id?: string
          staff_user?: string | null
          transaction_id?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: never
          issue_id?: string
          kind?: string
          member_id?: number
          reason?: string
          request_id?: string
          staff_user?: string | null
          transaction_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "serenity_credit_ledger_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "serenity_reward_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serenity_credit_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "serenity_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serenity_credit_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      serenity_credit_redemptions: {
        Row: {
          amount: number
          created_at: string
          member_id: number
          package_type: string
          refunded: boolean
          staff_user: string
          transaction_id: number
        }
        Insert: {
          amount: number
          created_at?: string
          member_id: number
          package_type: string
          refunded?: boolean
          staff_user: string
          transaction_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          member_id?: number
          package_type?: string
          refunded?: boolean
          staff_user?: string
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "serenity_credit_redemptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "serenity_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serenity_credit_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      serenity_discount_audits: {
        Row: {
          created_at: string
          discount_amount: number
          discount_rate: number
          discount_type: string
          eligible_amount: number
          final_total: number
          id: number
          membership_id: string
          original_total: number
          transaction_date: string
          transaction_id: number
        }
        Insert: {
          created_at?: string
          discount_amount: number
          discount_rate?: number
          discount_type: string
          eligible_amount: number
          final_total: number
          id?: number
          membership_id: string
          original_total: number
          transaction_date: string
          transaction_id: number
        }
        Update: {
          created_at?: string
          discount_amount?: number
          discount_rate?: number
          discount_type?: string
          eligible_amount?: number
          final_total?: number
          id?: number
          membership_id?: string
          original_total?: number
          transaction_date?: string
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "serenity_discount_audits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      serenity_members: {
        Row: {
          card_name: string
          created_at: string
          customer_name: string
          expiry_date: string
          id: number
          issue_date: string
          member_id: string
          qr_token: string
          status: string
        }
        Insert: {
          card_name?: string
          created_at?: string
          customer_name: string
          expiry_date?: string
          id?: never
          issue_date?: string
          member_id: string
          qr_token?: string
          status?: string
        }
        Update: {
          card_name?: string
          created_at?: string
          customer_name?: string
          expiry_date?: string
          id?: never
          issue_date?: string
          member_id?: string
          qr_token?: string
          status?: string
        }
        Relationships: []
      }
      serenity_referrals: {
        Row: {
          completed_date: string | null
          created_at: string
          member_id: number
          net_eligible: number
          package_type: string
          reason: string
          transaction_id: number
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          member_id: number
          net_eligible?: number
          package_type: string
          reason: string
          transaction_id: number
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          member_id?: number
          net_eligible?: number
          package_type?: string
          reason?: string
          transaction_id?: number
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serenity_referrals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "serenity_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serenity_referrals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      serenity_reward_bookings: {
        Row: {
          issue_id: string
          net_eligible: number
          transaction_id: number
        }
        Insert: {
          issue_id: string
          net_eligible: number
          transaction_id: number
        }
        Update: {
          issue_id?: string
          net_eligible?: number
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "serenity_reward_bookings_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "serenity_reward_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serenity_reward_bookings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "serenity_referrals"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      serenity_reward_issues: {
        Row: {
          amount: number
          expires_on: string
          id: string
          issued_at: string
          member_id: number
          net_eligible: number
          reason: string
          remaining: number
          staff_user: string
          status: string
        }
        Insert: {
          amount: number
          expires_on: string
          id?: string
          issued_at?: string
          member_id: number
          net_eligible: number
          reason: string
          remaining: number
          staff_user: string
          status?: string
        }
        Update: {
          amount?: number
          expires_on?: string
          id?: string
          issued_at?: string
          member_id?: number
          net_eligible?: number
          reason?: string
          remaining?: number
          staff_user?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "serenity_reward_issues_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "serenity_members"
            referencedColumns: ["id"]
          },
        ]
      }
      serenity_reward_staff: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
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
          day_tour_rate: number
          exclusive_fee: number
          function_hall_rate_per_day: number
          id: string
          kids_5_7_rate_day: number | null
          kids_5_7_rate_night: number | null
          kids_8_above_rate_day: number | null
          kids_8_above_rate_night: number | null
          kubo_room_rate: number
          overnight_rate: number
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
          day_tour_rate?: number
          exclusive_fee?: number
          function_hall_rate_per_day?: number
          id?: string
          kids_5_7_rate_day?: number | null
          kids_5_7_rate_night?: number | null
          kids_8_above_rate_day?: number | null
          kids_8_above_rate_night?: number | null
          kubo_room_rate?: number
          overnight_rate?: number
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
          day_tour_rate?: number
          exclusive_fee?: number
          function_hall_rate_per_day?: number
          id?: string
          kids_5_7_rate_day?: number | null
          kids_5_7_rate_night?: number | null
          kids_8_above_rate_day?: number | null
          kids_8_above_rate_night?: number | null
          kubo_room_rate?: number
          overnight_rate?: number
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
          additional_adult_fee: number | null
          adults: number
          amount_paid: number
          balance: number | null
          booking_type: string | null
          cancellation_date: string | null
          check_in: string | null
          check_out: string | null
          checkout_time: string | null
          children: number
          comments: string | null
          corkage_fee: number | null
          created_at: string
          credit_redeemed: number
          customer_name: string | null
          date_settled: string | null
          date_time: string
          default_hours: number | null
          deposit_amount: number | null
          deposit_date: string | null
          discount_amount: number
          drinks_corkage_fee: number | null
          end_time: string | null
          entry_time: string | null
          extend_amount: number | null
          extend_hours: number | null
          extension_fee: number | null
          function_hall_days: number | null
          function_hall_fee: number | null
          function_hall_rate: number | null
          function_hall_total: number | null
          game_type: string | null
          id: number
          kids_4_below: number | null
          kids_5_7: number | null
          kids_8_above: number | null
          last_payment_date: string | null
          liquor_corkage_fee: number | null
          maintenance_fee: number | null
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
          with_function_hall: boolean | null
        }
        Insert: {
          additional_adult_fee?: number | null
          adults?: number
          amount_paid?: number
          balance?: number | null
          booking_type?: string | null
          cancellation_date?: string | null
          check_in?: string | null
          check_out?: string | null
          checkout_time?: string | null
          children?: number
          comments?: string | null
          corkage_fee?: number | null
          created_at?: string
          credit_redeemed?: number
          customer_name?: string | null
          date_settled?: string | null
          date_time?: string
          default_hours?: number | null
          deposit_amount?: number | null
          deposit_date?: string | null
          discount_amount?: number
          drinks_corkage_fee?: number | null
          end_time?: string | null
          entry_time?: string | null
          extend_amount?: number | null
          extend_hours?: number | null
          extension_fee?: number | null
          function_hall_days?: number | null
          function_hall_fee?: number | null
          function_hall_rate?: number | null
          function_hall_total?: number | null
          game_type?: string | null
          id?: number
          kids_4_below?: number | null
          kids_5_7?: number | null
          kids_8_above?: number | null
          last_payment_date?: string | null
          liquor_corkage_fee?: number | null
          maintenance_fee?: number | null
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
          with_function_hall?: boolean | null
        }
        Update: {
          additional_adult_fee?: number | null
          adults?: number
          amount_paid?: number
          balance?: number | null
          booking_type?: string | null
          cancellation_date?: string | null
          check_in?: string | null
          check_out?: string | null
          checkout_time?: string | null
          children?: number
          comments?: string | null
          corkage_fee?: number | null
          created_at?: string
          credit_redeemed?: number
          customer_name?: string | null
          date_settled?: string | null
          date_time?: string
          default_hours?: number | null
          deposit_amount?: number | null
          deposit_date?: string | null
          discount_amount?: number
          drinks_corkage_fee?: number | null
          end_time?: string | null
          entry_time?: string | null
          extend_amount?: number | null
          extend_hours?: number | null
          extension_fee?: number | null
          function_hall_days?: number | null
          function_hall_fee?: number | null
          function_hall_rate?: number | null
          function_hall_total?: number | null
          game_type?: string | null
          id?: number
          kids_4_below?: number | null
          kids_5_7?: number | null
          kids_8_above?: number | null
          last_payment_date?: string | null
          liquor_corkage_fee?: number | null
          maintenance_fee?: number | null
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
          with_function_hall?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_booking_loyalty: {
        Args: {
          p_eligible: number
          p_expected_total: number
          p_id: number
          p_package_type: string
          p_token: string
        }
        Returns: undefined
      }
      record_loyalty_entrance: {
        Args: {
          p_excluded_adults: number
          p_other_discount: number
          p_token: string
          p_transaction: Json
        }
        Returns: number
      }
      serenity_adjust_credit: {
        Args: {
          p_amount: number
          p_booking: number
          p_issue: string
          p_kind: string
          p_reason: string
          p_request: string
        }
        Returns: undefined
      }
      serenity_expire_credits: {
        Args: { p_member: number }
        Returns: undefined
      }
      serenity_is_staff: { Args: { p_admin?: boolean }; Returns: boolean }
      serenity_issue_rewards: { Args: { p_member: number }; Returns: number }
      serenity_package_ceiling: {
        Args: { p_id: number; p_package: string }
        Returns: number
      }
      serenity_redeem: {
        Args: {
          p_amount: number
          p_booking: number
          p_package: string
          p_request: string
          p_token: string
        }
        Returns: undefined
      }
      serenity_save_referral: {
        Args: {
          p_booking: number
          p_completed: string
          p_net: number
          p_package: string
          p_reason: string
          p_token: string
        }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
