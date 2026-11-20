/**
 * Supabase database types.
 *
 * Hand-written to mirror supabase/migrations (0001–0003) in the same shape that
 * `supabase gen types typescript` produces. Once your project is linked you can
 * regenerate it with:
 *   npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
 *
 * pgvector columns are typed as `string` because PostgREST serialises them as
 * "[0.1,0.2,...]" (see toPgVector in Phase 2).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["user_role"];
          biometric_login_enabled: boolean;
          consent_given_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          biometric_login_enabled?: boolean;
          consent_given_at?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          biometric_login_enabled?: boolean;
          consent_given_at?: string | null;
        };
        Relationships: [];
      };
      people: {
        Row: {
          id: string;
          owner_id: string;
          linked_user_id: string | null;
          name: string;
          label: string | null;
          list_type: "none" | "allowed" | "flagged";
          notes: string | null;
          avatar_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          linked_user_id?: string | null;
          name: string;
          label?: string | null;
          list_type?: "none" | "allowed" | "flagged";
          notes?: string | null;
          avatar_path?: string | null;
          created_at?: string;
        };
        Update: {
          linked_user_id?: string | null;
          name?: string;
          label?: string | null;
          list_type?: "none" | "allowed" | "flagged";
          notes?: string | null;
          avatar_path?: string | null;
        };
        Relationships: Rel[];
      };
      face_embeddings: {
        Row: {
          id: string;
          person_id: string;
          owner_id: string;
          embedding: string;
          quality: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          owner_id: string;
          embedding: string;
          quality?: number | null;
          created_at?: string;
        };
        Update: { quality?: number | null };
        Relationships: [
          {
            foreignKeyName: "face_embeddings_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_embeddings: {
        Row: {
          id: string;
          person_id: string;
          owner_id: string;
          embedding: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          owner_id: string;
          embedding: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "voice_embeddings_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      recognition_events: {
        Row: {
          id: string;
          owner_id: string;
          person_id: string | null;
          similarity: number | null;
          source: "live" | "visitor" | "login" | "album" | "tool";
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          person_id?: string | null;
          similarity?: number | null;
          source: "live" | "visitor" | "login" | "album" | "tool";
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "recognition_events_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_attempts: {
        Row: {
          id: string;
          user_id: string | null;
          face_score: number | null;
          voice_score: number | null;
          liveness_passed: boolean | null;
          success: boolean;
          ip_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          face_score?: number | null;
          voice_score?: number | null;
          liveness_passed?: boolean | null;
          success: boolean;
          ip_hash?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: Rel[];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_id: string | null;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_id?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: Rel[];
      };
    };
    Views: {
      people_overview: {
        Row: {
          id: string;
          owner_id: string;
          linked_user_id: string | null;
          name: string;
          label: string | null;
          list_type: "none" | "allowed" | "flagged";
          notes: string | null;
          avatar_path: string | null;
          created_at: string;
          face_samples: number;
          voice_samples: number;
          last_seen_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      match_faces: {
        Args: { query: string; match_threshold: number; match_count: number };
        Returns: { person_id: string; name: string; similarity: number }[];
      };
      // Service role only (biometric login route).
      verify_face: { Args: { target_user: string; query: string }; Returns: number };
      verify_voice: { Args: { target_user: string; query: string }; Returns: number };
      user_id_by_email: { Args: { target_email: string }; Returns: string | null };
    };
    Enums: {
      user_role: "admin" | "member";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Profile = Tables<"profiles">;
export type Person = Tables<"people">;
export type PersonOverview = PublicSchema["Views"]["people_overview"]["Row"];
export type RecognitionEvent = Tables<"recognition_events">;
export type AuthAttempt = Tables<"auth_attempts">;
