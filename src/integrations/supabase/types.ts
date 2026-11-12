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
      ai_permission_review_state: {
        Row: {
          blocked: boolean
          id: string
          reason: string | null
          status: number | null
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          id: string
          reason?: string | null
          status?: number | null
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          id?: string
          reason?: string | null
          status?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          class_id: string | null
          date: string
          id: string
          period: string
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          date: string
          id?: string
          period?: string
          recorded_by?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          date?: string
          id?: string
          period?: string
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          active: boolean
          created_at: string
          department_id: string
          id: string
          key: string
          name: string
          sort_order: number
          start_time: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          department_id: string
          id?: string
          key?: string
          name: string
          sort_order?: number
          start_time?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          department_id?: string
          id?: string
          key?: string
          name?: string
          sort_order?: number
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          department_id: string | null
          grade_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          grade_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          grade_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      department_memberships: {
        Row: {
          can_edit: boolean
          can_take: boolean
          department_id: string
          role: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_take?: boolean
          department_id: string
          role: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_take?: boolean
          department_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_memberships_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          manager_correct_past: boolean
          manager_edit_today: boolean
          manager_record_today: boolean
          name: string
          teacher_correct_past: boolean
          teacher_edit_today: boolean
          teacher_record_today: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          manager_correct_past?: boolean
          manager_edit_today?: boolean
          manager_record_today?: boolean
          name: string
          teacher_correct_past?: boolean
          teacher_edit_today?: boolean
          teacher_record_today?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          manager_correct_past?: boolean
          manager_edit_today?: boolean
          manager_record_today?: boolean
          name?: string
          teacher_correct_past?: boolean
          teacher_edit_today?: boolean
          teacher_record_today?: boolean
        }
        Relationships: []
      }
      grades: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      registration_reviews: {
        Row: {
          reviewed_at: string
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          reviewed_at?: string
          reviewed_by?: string | null
          status: string
          user_id: string
        }
        Update: {
          reviewed_at?: string
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_accounts: {
        Row: {
          created_at: string
          student_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          student_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string | null
          created_at: string
          full_name: string
          gender: string
          id: string
          phone: string | null
          student_code: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          full_name: string
          gender: string
          id?: string
          phone?: string | null
          student_code: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          full_name?: string
          gender?: string
          id?: string
          phone?: string | null
          student_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_department_teacher: {
        Args: { _department: string; _email: string }
        Returns: undefined
      }
      assign_account_role: {
        Args: { _role: string; _student?: string; _target: string }
        Returns: undefined
      }
      can_access_class: {
        Args: { _class: string; _user: string }
        Returns: boolean
      }
      can_access_department: {
        Args: { _department: string; _user: string }
        Returns: boolean
      }
      can_edit_attendance: {
        Args: { _class: string; _date: string; _user: string }
        Returns: boolean
      }
      can_read_staff_profile: {
        Args: { _target: string; _user: string }
        Returns: boolean
      }
      can_record_attendance: {
        Args: { _class: string; _date: string; _user: string }
        Returns: boolean
      }
      decline_registration: { Args: { _target: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_own_student: {
        Args: { _student: string; _user: string }
        Returns: boolean
      }
      is_own_student_class: {
        Args: { _class: string; _user: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user: string }; Returns: boolean }
      manages_department: {
        Args: { _department: string; _user: string }
        Returns: boolean
      }
      set_attendance_grants: {
        Args: { _edit: boolean; _take: boolean; _target: string }
        Returns: undefined
      }
      set_department_access: {
        Args: { _department: string; _role: string; _target: string }
        Returns: undefined
      }
      set_school_role: {
        Args: { _role: string; _target: string }
        Returns: undefined
      }
      student_attendance_days: {
        Args: never
        Returns: {
          days_attended: number
          days_recorded: number
          student_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "teacher"
      attendance_status: "present" | "absent" | "late"
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
      app_role: ["admin", "teacher"],
      attendance_status: ["present", "absent", "late"],
    },
  },
} as const
