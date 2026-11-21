/**
 * Supabase database types.
 *
 * Hand-written to mirror supabase/migrations (0001–0006) in the same shape that
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
          disabled: boolean;
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
          /** Service role only (admin actions); not granted to users. */
          role?: Database["public"]["Enums"]["user_role"];
          disabled?: boolean;
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
          approval_status: ApprovalStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          biometrics_locked: boolean;
          locked_at: string | null;
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
          /** Set by admins via the service role; a trigger ignores these for other callers. */
          approval_status?: ApprovalStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          biometrics_locked?: boolean;
          locked_at?: string | null;
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
      attendance: {
        Row: {
          id: string;
          user_id: string;
          day: string;
          check_in_at: string;
          check_out_at: string | null;
          check_in_score: number | null;
          check_out_score: number | null;
          created_at: string;
          source: "self" | "kiosk";
        };
        Insert: {
          id?: string;
          user_id: string;
          day: string;
          check_in_at?: string;
          check_out_at?: string | null;
          check_in_score?: number | null;
          check_out_score?: number | null;
          created_at?: string;
          source?: "self" | "kiosk";
        };
        Update: {
          check_out_at?: string | null;
          check_out_score?: number | null;
        };
        Relationships: Rel[];
      };
      absence_reviews: {
        Row: {
          id: string;
          user_id: string;
          day: string;
          status: ReviewStatus;
          question: string | null;
          reason: string | null;
          proof_path: string | null;
          decision_note: string | null;
          asked_by: string | null;
          decided_by: string | null;
          asked_at: string | null;
          answered_at: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day: string;
          status?: ReviewStatus;
          question?: string | null;
          reason?: string | null;
          proof_path?: string | null;
          decision_note?: string | null;
          asked_by?: string | null;
          decided_by?: string | null;
          asked_at?: string | null;
          answered_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: ReviewStatus;
          question?: string | null;
          reason?: string | null;
          proof_path?: string | null;
          decision_note?: string | null;
          asked_by?: string | null;
          decided_by?: string | null;
          asked_at?: string | null;
          answered_at?: string | null;
          decided_at?: string | null;
        };
        Relationships: Rel[];
      };
      attendance_settings: {
        Row: { id: number; work_days: number[]; timezone: string; updated_at: string };
        Insert: { id?: number; work_days?: number[]; timezone?: string; updated_at?: string };
        Update: { work_days?: number[]; timezone?: string; updated_at?: string };
        Relationships: [];
      };
      identity_change_requests: {
        Row: {
          id: string;
          user_id: string;
          person_id: string | null;
          reason: string;
          status: ChangeRequestStatus;
          decision_note: string | null;
          decided_by: string | null;
          decided_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          person_id?: string | null;
          reason: string;
          status?: ChangeRequestStatus;
          decision_note?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          person_id?: string | null;
          status?: ChangeRequestStatus;
          decision_note?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: Rel[];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          priority: AnnouncementPriority;
          pinned: boolean;
          recipient_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          priority?: AnnouncementPriority;
          pinned?: boolean;
          recipient_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          pinned?: boolean;
          title?: string;
          body?: string;
          priority?: AnnouncementPriority;
        };
        Relationships: Rel[];
      };
      announcement_reads: {
        Row: { announcement_id: string; user_id: string; read_at: string };
        Insert: { announcement_id: string; user_id: string; read_at?: string };
        Update: Record<string, never>;
        Relationships: Rel[];
      };
      leave_requests: {
        Row: {
          id: string;
          user_id: string;
          start_day: string;
          end_day: string;
          kind: LeaveKind;
          reason: string;
          status: LeaveStatus;
          decision_note: string | null;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          start_day: string;
          end_day: string;
          kind?: LeaveKind;
          reason: string;
          status?: LeaveStatus;
          decision_note?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: LeaveStatus;
          decision_note?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
        };
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
          approval_status: ApprovalStatus;
          review_note: string | null;
          biometrics_locked: boolean;
          locked_at: string | null;
          reviewed_at: string | null;
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
      // Service role only (kiosk attendance).
      identify_user: {
        Args: { query: string };
        Returns: { user_id: string; similarity: number }[];
      };
    };
    Enums: {
      user_role: "admin" | "member";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ReviewStatus = "asked" | "answered" | "approved" | "rejected";
export type ChangeRequestStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type LeaveKind = "casual" | "sick" | "personal" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

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
export type Attendance = Tables<"attendance">;
export type AbsenceReview = Tables<"absence_reviews">;
export type AttendanceSettings = Tables<"attendance_settings">;
export type IdentityChangeRequest = Tables<"identity_change_requests">;
export type Announcement = Tables<"announcements">;
export type LeaveRequest = Tables<"leave_requests">;
