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
      attributes: {
        Row: {
          created_at: string
          id: string
          keywords: string[]
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: string[]
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string[]
          label?: string
          slug?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_attributes: {
        Row: {
          attribute_id: string
          mention_count: number
          profile_id: string
        }
        Insert: {
          attribute_id: string
          mention_count?: number
          profile_id: string
        }
        Update: {
          attribute_id?: string
          mention_count?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_attributes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_languages: {
        Row: {
          created_at: string
          language_code: string
          proficiency: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          language_code: string
          proficiency: string
          profile_id: string
        }
        Update: {
          created_at?: string
          language_code?: string
          proficiency?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_languages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_linkedin: {
        Row: {
          is_public: boolean
          profile_id: string
          updated_at: string
          url: string
        }
        Insert: {
          is_public?: boolean
          profile_id: string
          updated_at?: string
          url: string
        }
        Update: {
          is_public?: boolean
          profile_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_linkedin_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_rating: number
          company: string
          created_at: string
          full_name: string
          guidelines_accepted_at: string | null
          headline: string
          id: string
          linkedin_url: string | null
          location: string
          review_count: number
          review_slug: string
          status: string
          status_note: string
          status_return_date: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number
          company?: string
          created_at?: string
          full_name?: string
          guidelines_accepted_at?: string | null
          headline?: string
          id: string
          linkedin_url?: string | null
          location?: string
          review_count?: number
          review_slug?: string
          status?: string
          status_note?: string
          status_return_date?: string | null
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number
          company?: string
          created_at?: string
          full_name?: string
          guidelines_accepted_at?: string | null
          headline?: string
          id?: string
          linkedin_url?: string | null
          location?: string
          review_count?: number
          review_slug?: string
          status?: string
          status_note?: string
          status_return_date?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          review_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          review_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string
          review_id: string
          user_id: string
          vote: number
        }
        Insert: {
          created_at?: string
          review_id: string
          user_id: string
          vote: number
        }
        Update: {
          created_at?: string
          review_id?: string
          user_id?: string
          vote?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          helpful_count: number
          id: string
          is_featured: boolean
          profile_id: string
          rating: number
          relationship: string | null
          reviewer_id: string
          status: string
          unhelpful_count: number
          worked_company: string | null
          worked_from: string | null
          worked_to: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_featured?: boolean
          profile_id: string
          rating: number
          relationship?: string | null
          reviewer_id: string
          status?: string
          unhelpful_count?: number
          worked_company?: string | null
          worked_from?: string | null
          worked_to?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_featured?: boolean
          profile_id?: string
          rating?: number
          relationship?: string | null
          reviewer_id?: string
          status?: string
          unhelpful_count?: number
          worked_company?: string | null
          worked_from?: string | null
          worked_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
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
      verified_work_emails: {
        Row: {
          domain: string
          email: string
          id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          domain: string
          email: string
          id?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          domain?: string
          email?: string
          id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verified_work_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_email_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          domain: string
          email: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          domain: string
          email: string
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          domain?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_email_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_work_email_code: {
        Args: { _email: string; _user: string }
        Returns: string
      }
      featured_reviews: {
        Args: { _limit?: number }
        Returns: {
          body: string
          created_at: string
          helpful_count: number
          id: string
          profile_id: string
          profile_name: string
          rating: number
          relationship: string
          reviewer_name: string
          worked_company: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_free_email_domain: { Args: { _d: string }; Returns: boolean }
      is_participant: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      mark_conversation_read: { Args: { _conv: string }; Returns: undefined }
      platform_stats: {
        Args: never
        Returns: {
          avg_rating: number
          professionals: number
          reviews: number
        }[]
      }
      profile_filter_options: {
        Args: never
        Returns: {
          kind: string
          n: number
          value: string
        }[]
      }
      recalc_profile_attributes: { Args: { _pid: string }; Returns: undefined }
      recently_reviewed: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          avg_rating: number
          company: string
          full_name: string
          headline: string
          id: string
          last_review: string
          last_review_at: string
          location: string
          review_count: number
          status: string
          status_return_date: string
        }[]
      }
      refresh_profile_stats: { Args: { _pid: string }; Returns: undefined }
      regenerate_review_slug: { Args: never; Returns: string }
      review_contains_abuse: { Args: { _text: string }; Returns: boolean }
      search_profiles: {
        Args: {
          _limit?: number
          _location?: string
          _min_rating?: number
          _offset?: number
          _q?: string
          _sort?: string
        }
        Returns: {
          avatar_url: string
          avg_rating: number
          company: string
          created_at: string
          full_name: string
          headline: string
          id: string
          location: string
          review_count: number
          total_count: number
        }[]
      }
      search_profiles_v2: {
        Args: {
          _companies?: string[]
          _headlines?: string[]
          _limit?: number
          _location?: string
          _min_rating?: number
          _min_reviews?: number
          _offset?: number
          _q?: string
          _sort?: string
        }
        Returns: {
          avatar_url: string
          avg_rating: number
          company: string
          created_at: string
          full_name: string
          headline: string
          id: string
          location: string
          review_count: number
          total_count: number
        }[]
      }
      search_profiles_v3: {
        Args: {
          _attributes?: string[]
          _companies?: string[]
          _headlines?: string[]
          _include_inactive?: boolean
          _languages?: string[]
          _limit?: number
          _location?: string
          _min_proficiency?: string
          _min_rating?: number
          _min_reviews?: number
          _offset?: number
          _q?: string
          _sort?: string
        }
        Returns: {
          avatar_url: string
          avg_rating: number
          company: string
          created_at: string
          full_name: string
          headline: string
          id: string
          languages: Json
          location: string
          review_count: number
          status: string
          status_return_date: string
          top_attributes: Json
          total_count: number
        }[]
      }
      start_conversation: { Args: { _other: string }; Returns: string }
      text_mentions: {
        Args: { _body: string; _keywords: string[] }
        Returns: boolean
      }
      verified_colleague_reviews: {
        Args: { _profile: string }
        Returns: {
          review_id: string
        }[]
      }
      verify_work_email: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
