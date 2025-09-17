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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          is_personal: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_personal?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_personal?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_videos: {
        Row: {
          account_id: string
          code_name: string | null
          created_at: string
          en_alternative_titles: Json | null
          en_main_title: string | null
          en_publication_date: string | null
          en_script: string | null
          en_status: string | null
          en_thumbnail_url: string | null
          en_youtube_link: string | null
          es_alternative_titles: Json | null
          es_main_title: string | null
          es_publication_date: string | null
          es_script: string | null
          es_status: string | null
          es_thumbnail_url: string | null
          es_youtube_link: string | null
          id: string
          internal_title: string
          topic_id: string | null
          updated_at: string
          video_number: number
          video_type: string
        }
        Insert: {
          account_id: string
          code_name?: string | null
          created_at?: string
          en_alternative_titles?: Json | null
          en_main_title?: string | null
          en_publication_date?: string | null
          en_script?: string | null
          en_status?: string | null
          en_thumbnail_url?: string | null
          en_youtube_link?: string | null
          es_alternative_titles?: Json | null
          es_main_title?: string | null
          es_publication_date?: string | null
          es_script?: string | null
          es_status?: string | null
          es_thumbnail_url?: string | null
          es_youtube_link?: string | null
          id?: string
          internal_title: string
          topic_id?: string | null
          updated_at?: string
          video_number: number
          video_type?: string
        }
        Update: {
          account_id?: string
          code_name?: string | null
          created_at?: string
          en_alternative_titles?: Json | null
          en_main_title?: string | null
          en_publication_date?: string | null
          en_script?: string | null
          en_status?: string | null
          en_thumbnail_url?: string | null
          en_youtube_link?: string | null
          es_alternative_titles?: Json | null
          es_main_title?: string | null
          es_publication_date?: string | null
          es_script?: string | null
          es_status?: string | null
          es_thumbnail_url?: string | null
          es_youtube_link?: string | null
          id?: string
          internal_title?: string
          topic_id?: string | null
          updated_at?: string
          video_number?: number
          video_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          last_used_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_used_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_used_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          account_id: string
          channel_permissions: Json | null
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          permissions: Database["public"]["Enums"]["permission_scope"][] | null
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          channel_permissions?: Json | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Database["public"]["Enums"]["permission_scope"][] | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          channel_permissions?: Json | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Database["public"]["Enums"]["permission_scope"][] | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          account_id: string
          color: string | null
          created_at: string
          id: string
          keywords: string[] | null
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          color?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          color?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_channels: {
        Row: {
          account_id: string
          channel_id: string
          channel_title: string | null
          channel_url: string
          created_at: string
          id: string
          language: string
          last_synced_at: string | null
          subscriber_count: number | null
          thumbnail_url: string | null
          updated_at: string
          video_count: number | null
          view_count: number | null
        }
        Insert: {
          account_id: string
          channel_id: string
          channel_title?: string | null
          channel_url: string
          created_at?: string
          id?: string
          language?: string
          last_synced_at?: string | null
          subscriber_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          video_count?: number | null
          view_count?: number | null
        }
        Update: {
          account_id?: string
          channel_id?: string
          channel_title?: string | null
          channel_url?: string
          created_at?: string
          id?: string
          language?: string
          last_synced_at?: string | null
          subscriber_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          video_count?: number | null
          view_count?: number | null
        }
        Relationships: []
      }
      youtube_settings: {
        Row: {
          account_id: string
          auto_sync_enabled: boolean | null
          created_at: string
          id: string
          last_full_sync: string | null
          refresh_mode: string
          updated_at: string
        }
        Insert: {
          account_id: string
          auto_sync_enabled?: boolean | null
          created_at?: string
          id?: string
          last_full_sync?: string | null
          refresh_mode?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          auto_sync_enabled?: boolean | null
          created_at?: string
          id?: string
          last_full_sync?: string | null
          refresh_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      youtube_videos: {
        Row: {
          account_id: string
          channel_id: string
          comment_count: number | null
          content_video_id: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_short: boolean | null
          last_synced_at: string | null
          like_count: number | null
          published_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          topic_id: string | null
          updated_at: string
          video_id: string
          view_count: number | null
        }
        Insert: {
          account_id: string
          channel_id: string
          comment_count?: number | null
          content_video_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_short?: boolean | null
          last_synced_at?: string | null
          like_count?: number | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
          video_id: string
          view_count?: number | null
        }
        Update: {
          account_id?: string
          channel_id?: string
          comment_count?: number | null
          content_video_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_short?: boolean | null
          last_synced_at?: string | null
          like_count?: number | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          video_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_account: {
        Args: { account_id: string; user_id: string }
        Returns: boolean
      }
      get_team_members_with_profiles: {
        Args: { account_uuid: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
          invited_at: string
          invited_by: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "viewer"
      idea_status: "draft" | "ready" | "scheduled"
      permission_scope:
        | "billing"
        | "publishing"
        | "team"
        | "settings"
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
      app_role: ["owner", "admin", "viewer"],
      idea_status: ["draft", "ready", "scheduled"],
      permission_scope: [
        "billing",
        "publishing",
        "team",
        "settings",
      ],
    },
  },
} as const
