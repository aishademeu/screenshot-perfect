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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          condition_key: string
          demo: boolean
          detected_at: string
          employee_id: number
          evidence: Json
          id: string
          kind: string
          outlet_id: number | null
          priority: string
          region_id: number
          status: string
          title: string
        }
        Insert: {
          condition_key: string
          demo?: boolean
          detected_at?: string
          employee_id: number
          evidence?: Json
          id?: string
          kind: string
          outlet_id?: number | null
          priority: string
          region_id: number
          status?: string
          title: string
        }
        Update: {
          condition_key?: string
          demo?: boolean
          detected_at?: string
          employee_id?: number
          evidence?: Json
          id?: string
          kind?: string
          outlet_id?: number | null
          priority?: string
          region_id?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "retail_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      detection_settings: {
        Row: {
          geofence_meters: number
          id: number
          missed_visits: number
          plan_threshold: number
          sales_drop: number
        }
        Insert: {
          geofence_meters?: number
          id?: number
          missed_visits?: number
          plan_threshold?: number
          sales_drop?: number
        }
        Update: {
          geofence_meters?: number
          id?: number
          missed_visits?: number
          plan_threshold?: number
          sales_drop?: number
        }
        Relationships: []
      }
      employees: {
        Row: {
          demo: boolean
          id: number
          name: string
          photo_discipline: number
          region_id: number
        }
        Insert: {
          demo?: boolean
          id: number
          name: string
          photo_discipline?: number
          region_id: number
        }
        Update: {
          demo?: boolean
          id?: number
          name?: string
          photo_discipline?: number
          region_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "employees_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          expected: boolean
          id: string
          last_verified_at: string | null
          outlet_id: number
          status: string
        }
        Insert: {
          expected?: boolean
          id: string
          last_verified_at?: string | null
          outlet_id: number
          status: string
        }
        Update: {
          expected?: boolean
          id?: string
          last_verified_at?: string | null
          outlet_id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "retail_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_reports: {
        Row: {
          created_at: string
          id: string
          outlet_id: number
          rejection_reason: string | null
          status: string
          storage_path: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          outlet_id: number
          rejection_reason?: string | null
          status?: string
          storage_path: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          outlet_id?: number
          rejection_reason?: string | null
          status?: string
          storage_path?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_reports_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "retail_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_reports_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_visits: {
        Row: {
          completed_at: string | null
          id: string
          outlet_id: number
          scheduled_at: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          outlet_id: number
          scheduled_at: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          outlet_id?: number
          scheduled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_visits_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "retail_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          display_name: string
          id: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          display_name?: string
          id: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          demo: boolean
          id: number
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          demo?: boolean
          id: number
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          demo?: boolean
          id?: number
          latitude?: number | null
          longitude?: number | null
          name?: string
        }
        Relationships: []
      }
      retail_outlets: {
        Row: {
          address: string
          coordinates_verified: boolean
          demo: boolean
          employee_id: number
          id: number
          latitude: number | null
          longitude: number | null
          name: string
          region_id: number
        }
        Insert: {
          address?: string
          coordinates_verified?: boolean
          demo?: boolean
          employee_id: number
          id: number
          latitude?: number | null
          longitude?: number | null
          name: string
          region_id: number
        }
        Update: {
          address?: string
          coordinates_verified?: boolean
          demo?: boolean
          employee_id?: number
          id?: number
          latitude?: number | null
          longitude?: number | null
          name?: string
          region_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "retail_outlets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_outlets_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_records: {
        Row: {
          amount: number
          id: string
          outlet_id: number
          period: string
          plan: number
        }
        Insert: {
          amount: number
          id?: string
          outlet_id: number
          period: string
          plan: number
        }
        Update: {
          amount?: number
          id?: string
          outlet_id?: number
          period?: string
          plan?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_records_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "retail_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          action: string
          comment: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          comment?: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          comment?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          alert_id: string
          assigned_employee_id: number
          created_at: string
          deadline: string
          id: string
          resolution: string | null
          status: string
        }
        Insert: {
          alert_id: string
          assigned_employee_id: number
          created_at?: string
          deadline: string
          id?: string
          resolution?: string | null
          status?: string
        }
        Update: {
          alert_id?: string
          assigned_employee_id?: number
          created_at?: string
          deadline?: string
          id?: string
          resolution?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: true
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          employee_id: number | null
          id: string
          region_id: number | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          employee_id?: number | null
          id?: string
          region_id?: number | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          employee_id?: number | null
          id?: string
          region_id?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          accuracy: number
          checklist: Json
          created_at: string
          id: string
          latitude: number
          longitude: number
          outlet_id: number
          user_id: string
          verified: boolean
        }
        Insert: {
          accuracy: number
          checklist?: Json
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          outlet_id: number
          user_id: string
          verified?: boolean
        }
        Update: {
          accuracy?: number
          checklist?: Json
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          outlet_id?: number
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "visits_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "retail_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_scope: { Args: { e: number; r: number }; Returns: boolean }
      detect_problems: { Args: { target_period?: string }; Returns: undefined }
      is_manager: { Args: { r: number }; Returns: boolean }
    }
    Enums: {
      app_role: "rep" | "rd" | "sd" | "ceo"
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
    Enums: {
      app_role: ["rep", "rd", "sd", "ceo"],
    },
  },
} as const
