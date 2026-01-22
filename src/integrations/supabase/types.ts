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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_admin: boolean
          name: string | null
          phone_number: string
          role: Database["public"]["Enums"]["group_member_role"]
          updated_at: string
          whatsapp_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_admin?: boolean
          name?: string | null
          phone_number: string
          role?: Database["public"]["Enums"]["group_member_role"]
          updated_at?: string
          whatsapp_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_admin?: boolean
          name?: string | null
          phone_number?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          updated_at?: string
          whatsapp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "monitored_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          message_type: string | null
          sender_name: string | null
          sender_phone: string
          sender_role: string
          ticket_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          message_type?: string | null
          sender_name?: string | null
          sender_phone: string
          sender_role: string
          ticket_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          message_type?: string | null
          sender_name?: string | null
          sender_phone?: string
          sender_role?: string
          ticket_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "monitored_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_groups: {
        Row: {
          created_at: string
          evolution_instance: string | null
          id: string
          is_active: boolean
          is_client_group: boolean
          name: string
          pending_classification: boolean
          sla_limit_minutes: number
          updated_at: string
          whatsapp_id: string
        }
        Insert: {
          created_at?: string
          evolution_instance?: string | null
          id?: string
          is_active?: boolean
          is_client_group?: boolean
          name: string
          pending_classification?: boolean
          sla_limit_minutes?: number
          updated_at?: string
          whatsapp_id: string
        }
        Update: {
          created_at?: string
          evolution_instance?: string | null
          id?: string
          is_active?: boolean
          is_client_group?: boolean
          name?: string
          pending_classification?: boolean
          sla_limit_minutes?: number
          updated_at?: string
          whatsapp_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone_number: string
          role: Database["public"]["Enums"]["team_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone_number: string
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone_number?: string
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Relationships: []
      }
      ticket_demands: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolution_time_minutes: number | null
          resolved_at: string | null
          sla_exceeded: boolean
          status: string
          ticket_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          sla_exceeded?: boolean
          status?: string
          ticket_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          sla_exceeded?: boolean
          status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_demands_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_summary: string | null
          analysis_count: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          first_response_at: string | null
          group_id: string
          id: string
          last_analysis_at: string | null
          next_analysis_at: string | null
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          sentiment: string | null
          status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          ai_summary?: string | null
          analysis_count?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          first_response_at?: string | null
          group_id: string
          id?: string
          last_analysis_at?: string | null
          next_analysis_at?: string | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sentiment?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          ai_summary?: string | null
          analysis_count?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          first_response_at?: string | null
          group_id?: string
          id?: string
          last_analysis_at?: string | null
          next_analysis_at?: string | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sentiment?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tickets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "monitored_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      group_member_role: "cs" | "client" | "traffic_manager" | "unknown"
      team_role: "CS" | "Manager" | "Support" | "Admin"
      ticket_status: "open" | "resolved"
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
    Enums: {
      group_member_role: ["cs", "client", "traffic_manager", "unknown"],
      team_role: ["CS", "Manager", "Support", "Admin"],
      ticket_status: ["open", "resolved"],
    },
  },
} as const
