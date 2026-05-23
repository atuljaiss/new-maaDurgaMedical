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
      leave_policy: {
        Row: {
          allowed_monthly_days: number
          allowed_yearly_days: number
          calendar_mode: Database["public"]["Enums"]["calendar_mode"]
          currency: string
          id: number
          updated_at: string
          working_days: number[]
        }
        Insert: {
          allowed_monthly_days?: number
          allowed_yearly_days?: number
          calendar_mode?: Database["public"]["Enums"]["calendar_mode"]
          currency?: string
          id?: number
          updated_at?: string
          working_days?: number[]
        }
        Update: {
          allowed_monthly_days?: number
          allowed_yearly_days?: number
          calendar_mode?: Database["public"]["Enums"]["calendar_mode"]
          currency?: string
          id?: number
          updated_at?: string
          working_days?: number[]
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          admin_comment: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          end_date: string | null
          half_day_part: Database["public"]["Enums"]["half_day_part"] | null
          id: number
          is_half_day: boolean
          leave_date: string | null
          reason: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          end_date?: string | null
          half_day_part?: Database["public"]["Enums"]["half_day_part"] | null
          id?: number
          is_half_day?: boolean
          leave_date?: string | null
          reason?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          end_date?: string | null
          half_day_part?: Database["public"]["Enums"]["half_day_part"] | null
          id?: number
          is_half_day?: boolean
          leave_date?: string | null
          reason?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          employee_code: string | null
          full_name: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_code?: string | null
          full_name: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_code?: string | null
          full_name?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          effective_from: string
          id: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          effective_from: string
          id?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          effective_from?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      salary_payouts: {
        Row: {
          allowed_monthly_days: number
          allowed_yearly_days: number
          base_salary: number
          deduction_amount: number
          excess_days_in_month: number
          excess_days_ytd: number
          generated_at: string
          id: number
          leave_days_in_month: number
          leave_days_ytd: number
          month: string
          net_salary: number
          user_id: string
        }
        Insert: {
          allowed_monthly_days: number
          allowed_yearly_days: number
          base_salary: number
          deduction_amount?: number
          excess_days_in_month?: number
          excess_days_ytd?: number
          generated_at?: string
          id?: number
          leave_days_in_month?: number
          leave_days_ytd?: number
          month: string
          net_salary: number
          user_id: string
        }
        Update: {
          allowed_monthly_days?: number
          allowed_yearly_days?: number
          base_salary?: number
          deduction_amount?: number
          excess_days_in_month?: number
          excess_days_ytd?: number
          generated_at?: string
          id?: number
          leave_days_in_month?: number
          leave_days_ytd?: number
          month?: string
          net_salary?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approved_leave_days_expanded: {
        Args: { p_from: string; p_to: string; p_user_id: string }
        Returns: {
          day: string
          day_fraction: number
        }[]
      }
      approved_leave_days_in_month: {
        Args: { p_month: string; p_user_id: string }
        Returns: number
      }
      approved_leave_days_ytd: {
        Args: { p_month: string; p_user_id: string }
        Returns: number
      }
      commit_payroll: { Args: { p_month: string }; Returns: undefined }
      days_in_month_by_policy: { Args: { p_month: string }; Returns: number }
      generate_payroll_preview: {
        Args: { p_month: string }
        Returns: {
          allowed_monthly_days: number
          base_salary: number
          deduction_amount: number
          excess_days: number
          full_name: string
          has_salary_record: boolean
          leave_days_in_month: number
          net_salary: number
          per_day_rate: number
          user_id: string
        }[]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      calendar_mode: "all_days" | "working_days"
      half_day_part: "AM" | "PM"
      leave_status: "pending" | "approved" | "rejected"
      user_role: "admin" | "employee"
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
    Enums: {
      calendar_mode: ["all_days", "working_days"],
      half_day_part: ["AM", "PM"],
      leave_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "employee"],
    },
  },
} as const


export type Profile = Database['public']['Tables']['profiles']['Row']
export type LeavePolicy = Database['public']['Tables']['leave_policy']['Row']
export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row']
export type SalaryHistory = Database['public']['Tables']['salary_history']['Row']
export type SalaryPayout = Database['public']['Tables']['salary_payouts']['Row']
export type LeaveStatus = Database['public']['Enums']['leave_status']
export type PayrollPreview = { user_id: string; full_name: string; has_salary_record: boolean; base_salary: number; leave_days_in_month: number; allowed_leaves: number; used_leaves: number; excess_days: number; deduction_amount: number; net_salary: number }

