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
      audit_events: {
        Row: {
          action: string
          actor_profile_id: string | null
          id: string
          ip_address: unknown
          metadata: Json
          occurred_at: string
          organization_id: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          organization_id?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          organization_id?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_invite_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          failure_count: number
          id: string
          idempotency_key: string
          organization_id: string
          requested_by: string | null
          started_at: string | null
          state: Database["public"]["Enums"]["batch_state"]
          success_count: number
          total_count: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failure_count?: number
          id?: string
          idempotency_key: string
          organization_id: string
          requested_by?: string | null
          started_at?: string | null
          state?: Database["public"]["Enums"]["batch_state"]
          success_count?: number
          total_count?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failure_count?: number
          id?: string
          idempotency_key?: string
          organization_id?: string
          requested_by?: string | null
          started_at?: string | null
          state?: Database["public"]["Enums"]["batch_state"]
          success_count?: number
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_invite_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_invite_batches_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_invite_entries: {
        Row: {
          batch_id: string
          created_at: string
          email: string
          error_code: string | null
          error_message: string | null
          id: string
          invitation_id: string | null
          role: Database["public"]["Enums"]["organization_role"]
          state: Database["public"]["Enums"]["invitation_state"]
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          email: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          invitation_id?: string | null
          role?: Database["public"]["Enums"]["organization_role"]
          state?: Database["public"]["Enums"]["invitation_state"]
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          email?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          invitation_id?: string | null
          role?: Database["public"]["Enums"]["organization_role"]
          state?: Database["public"]["Enums"]["invitation_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_invite_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "bulk_invite_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_invite_entries_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_identities: {
        Row: {
          created_at: string
          email: string | null
          email_verified: boolean
          id: string
          issuer: string
          last_seen_at: string | null
          profile_id: string
          provider: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verified?: boolean
          id?: string
          issuer: string
          last_seen_at?: string | null
          profile_id: string
          provider?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verified?: boolean
          id?: string
          issuer?: string
          last_seen_at?: string | null
          profile_id?: string
          provider?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["organization_role"]
          state: Database["public"]["Enums"]["invitation_state"]
          updated_at: string
          workos_invitation_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["organization_role"]
          state?: Database["public"]["Enums"]["invitation_state"]
          updated_at?: string
          workos_invitation_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["organization_role"]
          state?: Database["public"]["Enums"]["invitation_state"]
          updated_at?: string
          workos_invitation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          organization_id: string
          profile_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["organization_role"]
          state: Database["public"]["Enums"]["membership_state"]
          updated_at: string
          workos_membership_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          organization_id: string
          profile_id: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["organization_role"]
          state?: Database["public"]["Enums"]["membership_state"]
          updated_at?: string
          workos_membership_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          organization_id?: string
          profile_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["organization_role"]
          state?: Database["public"]["Enums"]["membership_state"]
          updated_at?: string
          workos_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          state: Database["public"]["Enums"]["record_state"]
          updated_at: string
          workos_organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          state?: Database["public"]["Enums"]["record_state"]
          updated_at?: string
          workos_organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          state?: Database["public"]["Enums"]["record_state"]
          updated_at?: string
          workos_organization_id?: string
        }
        Relationships: []
      }
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempt_count: number
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_attempt_at: string | null
          occurred_at: string
          organization_id: string | null
          payload: Json
          published_at: string | null
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempt_count?: number
          event_type: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_attempt_at?: string | null
          occurred_at?: string
          organization_id?: string | null
          payload: Json
          published_at?: string | null
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempt_count?: number
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_attempt_at?: string | null
          occurred_at?: string
          organization_id?: string | null
          payload?: Json
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbox_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string | null
          primary_email: string | null
          state: Database["public"]["Enums"]["record_state"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string | null
          primary_email?: string | null
          state?: Database["public"]["Enums"]["record_state"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string | null
          primary_email?: string | null
          state?: Database["public"]["Enums"]["record_state"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          profile_id: string
          project_id: string
          role: Database["public"]["Enums"]["project_access_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          profile_id: string
          project_id: string
          role?: Database["public"]["Enums"]["project_access_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          profile_id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_access_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          slug: string
          state: Database["public"]["Enums"]["record_state"]
          team_id: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["project_visibility"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          slug: string
          state?: Database["public"]["Enums"]["record_state"]
          team_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["project_visibility"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          state?: Database["public"]["Enums"]["record_state"]
          team_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["project_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_same_organization"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      resource_grants: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          organization_id: string
          permission: Database["public"]["Enums"]["resource_permission"]
          principal_id: string
          principal_type: Database["public"]["Enums"]["resource_principal_type"]
          resource_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          permission: Database["public"]["Enums"]["resource_permission"]
          principal_id: string
          principal_type: Database["public"]["Enums"]["resource_principal_type"]
          resource_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          permission?: Database["public"]["Enums"]["resource_permission"]
          principal_id?: string
          principal_type?: Database["public"]["Enums"]["resource_principal_type"]
          resource_id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
        }
        Relationships: [
          {
            foreignKeyName: "resource_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_grants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          profile_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          slug: string
          state: Database["public"]["Enums"]["record_state"]
          updated_at: string
          workos_group_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          slug: string
          state?: Database["public"]["Enums"]["record_state"]
          updated_at?: string
          workos_group_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          state?: Database["public"]["Enums"]["record_state"]
          updated_at?: string
          workos_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_inbox: {
        Row: {
          attempt_count: number
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string | null
          organization_external_id: string | null
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          state: Database["public"]["Enums"]["webhook_state"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string | null
          organization_external_id?: string | null
          payload: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          state?: Database["public"]["Enums"]["webhook_state"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string | null
          organization_external_id?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          state?: Database["public"]["Enums"]["webhook_state"]
          updated_at?: string
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
      batch_state:
        | "pending"
        | "processing"
        | "completed"
        | "partially_failed"
        | "failed"
        | "cancelled"
      invitation_state: "pending" | "accepted" | "revoked" | "expired"
      membership_state: "invited" | "active" | "suspended" | "revoked"
      organization_role: "owner" | "admin" | "builder" | "member" | "viewer"
      project_access_role: "owner" | "editor" | "contributor" | "viewer"
      project_visibility: "private" | "team" | "organization"
      record_state: "active" | "disabled" | "archived"
      resource_permission: "view" | "use" | "edit" | "manage"
      resource_principal_type: "profile" | "team"
      resource_type: "organization" | "team" | "project"
      webhook_state:
        | "pending"
        | "processing"
        | "processed"
        | "failed"
        | "dead_letter"
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
      batch_state: [
        "pending",
        "processing",
        "completed",
        "partially_failed",
        "failed",
        "cancelled",
      ],
      invitation_state: ["pending", "accepted", "revoked", "expired"],
      membership_state: ["invited", "active", "suspended", "revoked"],
      organization_role: ["owner", "admin", "builder", "member", "viewer"],
      project_access_role: ["owner", "editor", "contributor", "viewer"],
      project_visibility: ["private", "team", "organization"],
      record_state: ["active", "disabled", "archived"],
      resource_permission: ["view", "use", "edit", "manage"],
      resource_principal_type: ["profile", "team"],
      resource_type: ["organization", "team", "project"],
      webhook_state: [
        "pending",
        "processing",
        "processed",
        "failed",
        "dead_letter",
      ],
    },
  },
} as const
