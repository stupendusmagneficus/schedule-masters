export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointment_access_tokens: {
        Row: {
          appointment_id: string
          created_at: string
          expires_at: string
          id: string
          purpose: Database["public"]["Enums"]["access_token_purpose"]
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          expires_at: string
          id?: string
          purpose: Database["public"]["Enums"]["access_token_purpose"]
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: Database["public"]["Enums"]["access_token_purpose"]
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_access_tokens_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_events: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          event_type: Database["public"]["Enums"]["appointment_event_type"]
          from_status: Database["public"]["Enums"]["appointment_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          event_type: Database["public"]["Enums"]["appointment_event_type"]
          from_status?: Database["public"]["Enums"]["appointment_status"] | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: Database["public"]["Enums"]["appointment_event_type"]
          from_status?: Database["public"]["Enums"]["appointment_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointment_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_notification_events: {
        Row: {
          appointment_id: string
          channel: string
          created_at: string
          error_code: string | null
          id: string
          status: Database["public"]["Enums"]["notification_delivery_status"]
          type: Database["public"]["Enums"]["notification_type"]
          workspace_id: string
        }
        Insert: {
          appointment_id: string
          channel?: string
          created_at?: string
          error_code?: string | null
          id?: string
          status: Database["public"]["Enums"]["notification_delivery_status"]
          type: Database["public"]["Enums"]["notification_type"]
          workspace_id: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          created_at?: string
          error_code?: string | null
          id?: string
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          type?: Database["public"]["Enums"]["notification_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notification_events_appointment_workspace_fkey"
            columns: ["appointment_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "appointment_notification_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          buffer_after_minutes_snapshot: number
          buffer_before_minutes_snapshot: number
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency_snapshot: string
          customer_id: string
          customer_locale: string
          customer_note: string | null
          customer_notification_consent_at: string | null
          duration_minutes_snapshot: number
          ends_at: string
          id: string
          master_note: string | null
          occupied_range: unknown
          paid_amount: number
          price_amount_snapshot: number
          service_id: string | null
          service_name_snapshot: string
          source: Database["public"]["Enums"]["appointment_source"]
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          buffer_after_minutes_snapshot?: number
          buffer_before_minutes_snapshot?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency_snapshot: string
          customer_id: string
          customer_locale?: string
          customer_note?: string | null
          customer_notification_consent_at?: string | null
          duration_minutes_snapshot: number
          ends_at: string
          id?: string
          master_note?: string | null
          occupied_range: unknown
          paid_amount?: number
          price_amount_snapshot: number
          service_id?: string | null
          service_name_snapshot: string
          source: Database["public"]["Enums"]["appointment_source"]
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          buffer_after_minutes_snapshot?: number
          buffer_before_minutes_snapshot?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency_snapshot?: string
          customer_id?: string
          customer_locale?: string
          customer_note?: string | null
          customer_notification_consent_at?: string | null
          duration_minutes_snapshot?: number
          ends_at?: string
          id?: string
          master_note?: string | null
          occupied_range?: unknown
          paid_amount?: number
          price_amount_snapshot?: number
          service_id?: string | null
          service_name_snapshot?: string
          source?: Database["public"]["Enums"]["appointment_source"]
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_same_workspace_fkey"
            columns: ["workspace_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_same_workspace_fkey"
            columns: ["workspace_id", "service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "appointments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_breaks: {
        Row: {
          availability_rule_id: string
          end_local_time: string
          id: string
          start_local_time: string
        }
        Insert: {
          availability_rule_id: string
          end_local_time: string
          id?: string
          start_local_time: string
        }
        Update: {
          availability_rule_id?: string
          end_local_time?: string
          id?: string
          start_local_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_breaks_availability_rule_id_fkey"
            columns: ["availability_rule_id"]
            isOneToOne: false
            referencedRelation: "availability_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["availability_exception_kind"]
          reason: string | null
          starts_at: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          kind: Database["public"]["Enums"]["availability_exception_kind"]
          reason?: string | null
          starts_at: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["availability_exception_kind"]
          reason?: string | null
          starts_at?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          created_at: string
          day_of_week: number
          end_local_time: string
          id: string
          is_active: boolean
          start_local_time: string
          updated_at: string
          valid_from: string
          valid_until: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_local_time: string
          id?: string
          is_active?: boolean
          start_local_time: string
          updated_at?: string
          valid_from: string
          valid_until?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_local_time?: string
          id?: string
          is_active?: boolean
          start_local_time?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_decision_email_outbox: {
        Row: {
          appointment_id: string
          attempts: number
          created_at: string
          decision: string
          finalized_at: string | null
          id: string
          last_error: string | null
          locale: string
          next_attempt_at: string
          processing_at: string | null
          provider_accepted_at: string | null
          recipient: string
          service_name: string
          starts_at: string
          status: string
          timezone: string
          workspace_id: string
          workspace_name: string
        }
        Insert: {
          appointment_id: string
          attempts?: number
          created_at?: string
          decision: string
          finalized_at?: string | null
          id?: string
          last_error?: string | null
          locale: string
          next_attempt_at?: string
          processing_at?: string | null
          provider_accepted_at?: string | null
          recipient: string
          service_name: string
          starts_at: string
          status?: string
          timezone: string
          workspace_id: string
          workspace_name: string
        }
        Update: {
          appointment_id?: string
          attempts?: number
          created_at?: string
          decision?: string
          finalized_at?: string | null
          id?: string
          last_error?: string | null
          locale?: string
          next_attempt_at?: string
          processing_at?: string | null
          provider_accepted_at?: string | null
          recipient?: string
          service_name?: string
          starts_at?: string
          status?: string
          timezone?: string
          workspace_id?: string
          workspace_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_decision_email_outbox_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_decision_email_outbox_appointment_id_workspace_id_fkey"
            columns: ["appointment_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "booking_decision_email_outbox_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          anonymized_at: string | null
          auth_user_id: string | null
          created_at: string
          email: string | null
          id: string
          last_visit_at: string | null
          marketing_consent_at: string | null
          name: string
          normalized_email: string | null
          normalized_phone: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          anonymized_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_visit_at?: string | null
          marketing_consent_at?: string | null
          name: string
          normalized_email?: string | null
          normalized_phone?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          anonymized_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_visit_at?: string | null
          marketing_consent_at?: string | null
          name?: string
          normalized_email?: string | null
          normalized_phone?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          appointment_id: string
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          last_error: string | null
          recipient: string
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_job_status"]
          type: Database["public"]["Enums"]["notification_type"]
          workspace_id: string
        }
        Insert: {
          appointment_id: string
          attempts?: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          recipient: string
          scheduled_for: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_job_status"]
          type: Database["public"]["Enums"]["notification_type"]
          workspace_id: string
        }
        Update: {
          appointment_id?: string
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          recipient?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_job_status"]
          type?: Database["public"]["Enums"]["notification_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_appointment_same_workspace_fkey"
            columns: ["workspace_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "notification_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      public_booking_requests: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          response: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          response?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          response?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_booking_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archived_at: string | null
          buffer_after_minutes: number
          buffer_before_minutes: number
          category: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_amount: number
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price_amount: number
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_amount?: number
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list_entries: {
        Row: {
          appointment_id: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          desired_date: string
          desired_time_from: string | null
          desired_time_to: string | null
          id: string
          note: string | null
          service_id: string
          source_appointment_id: string | null
          status: Database["public"]["Enums"]["waiting_list_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          desired_date: string
          desired_time_from?: string | null
          desired_time_to?: string | null
          id?: string
          note?: string | null
          service_id: string
          source_appointment_id?: string | null
          status?: Database["public"]["Enums"]["waiting_list_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          desired_date?: string
          desired_time_from?: string | null
          desired_time_to?: string | null
          id?: string
          note?: string | null
          service_id?: string
          source_appointment_id?: string | null
          status?: Database["public"]["Enums"]["waiting_list_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_entries_source_appointment_id_fkey"
            columns: ["source_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list_entry_events: {
        Row: {
          actor_user_id: string | null
          appointment_id: string | null
          created_at: string
          entry_id: string
          from_status: Database["public"]["Enums"]["waiting_list_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["waiting_list_status"]
        }
        Insert: {
          actor_user_id?: string | null
          appointment_id?: string | null
          created_at?: string
          entry_id: string
          from_status?:
            | Database["public"]["Enums"]["waiting_list_status"]
            | null
          id?: string
          to_status: Database["public"]["Enums"]["waiting_list_status"]
        }
        Update: {
          actor_user_id?: string | null
          appointment_id?: string | null
          created_at?: string
          entry_id?: string
          from_status?:
            | Database["public"]["Enums"]["waiting_list_status"]
            | null
          id?: string
          to_status?: Database["public"]["Enums"]["waiting_list_status"]
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_entry_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_entry_events_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "waiting_list_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          locale: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["workspace_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["workspace_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["workspace_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_master_workspace: {
        Args: {
          p_duration_minutes: number
          p_end_local_time: string
          p_locale: string
          p_name: string
          p_price_amount: number
          p_service_name: string
          p_slug: string
          p_start_local_time: string
          p_working_days: number[]
        }
        Returns: Json
      }
      check_public_booking_request: { Args: never; Returns: undefined }
      claim_booking_decision_emails: {
        Args: { p_batch_size?: number }
        Returns: {
          attempts: number
          decision: string
          id: string
          locale: string
          recipient: string
          service_name: string
          starts_at: string
          timezone: string
          workspace_name: string
        }[]
      }
      claim_booking_decision_emails_for_delivery: {
        Args: { p_batch_size?: number; p_recipient_allowlist?: string[] }
        Returns: {
          attempts: number
          decision: string
          id: string
          locale: string
          recipient: string
          service_name: string
          starts_at: string
          timezone: string
          workspace_name: string
        }[]
      }
      create_customer_appointment_link: {
        Args: {
          p_appointment_id: string
          p_customer_consent_confirmed: boolean
        }
        Returns: Json
      }
      create_master_availability_block: {
        Args: {
          p_date: string
          p_end_local_time: string
          p_reason?: string
          p_start_local_time: string
          p_workspace_id: string
        }
        Returns: Json
      }
      create_master_booking: {
        Args: {
          p_customer_id?: string
          p_duration_minutes?: number
          p_email?: string
          p_idempotency_key: string
          p_master_note?: string
          p_name?: string
          p_phone?: string
          p_price_amount?: number
          p_service_id: string
          p_starts_at: string
          p_workspace_id: string
        }
        Returns: Json
      }
      create_master_waiting_list_customer: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_desired_date: string
          p_desired_time_from?: string
          p_desired_time_to?: string
          p_note?: string
          p_service_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      create_master_waiting_list_entry: {
        Args: {
          p_customer_email?: string
          p_customer_id?: string
          p_customer_name: string
          p_customer_phone?: string
          p_desired_date: string
          p_desired_time_from?: string
          p_desired_time_to?: string
          p_note?: string
          p_service_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      create_public_booking: {
        Args: {
          p_customer_note?: string
          p_email: string
          p_idempotency_key?: string
          p_locale?: string
          p_name: string
          p_phone: string
          p_service_id: string
          p_slug: string
          p_starts_at: string
        }
        Returns: Json
      }
      delete_master_availability_block: {
        Args: { p_block_id: string; p_workspace_id: string }
        Returns: Json
      }
      enforce_public_booking_quota: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      finish_booking_decision_email: {
        Args: {
          p_error?: string
          p_id: string
          p_retryable?: boolean
          p_success: boolean
        }
        Returns: string
      }
      get_customer_appointment: { Args: { p_token: string }; Returns: Json }
      get_master_available_slots: {
        Args: { p_date: string; p_service_id: string; p_workspace_id: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      get_master_month_available_slots: {
        Args: {
          p_month_start: string
          p_service_id: string
          p_workspace_id: string
        }
        Returns: {
          available_date: string
          ends_at: string
          starts_at: string
        }[]
      }
      get_public_available_slots: {
        Args: { p_date: string; p_service_id: string; p_slug: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      get_public_booking_context: { Args: { p_slug: string }; Returns: Json }
      is_workspace_member: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      list_master_appointments: {
        Args: { p_from_date: string; p_to_date: string; p_workspace_id: string }
        Returns: {
          currency: string
          customer_id: string
          customer_name: string
          duration_minutes: number
          ends_at: string
          id: string
          is_new_customer: boolean
          is_returning_customer: boolean
          paid_amount: number
          price_amount: number
          service_name: string
          source: Database["public"]["Enums"]["appointment_source"]
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      list_master_availability_blocks: {
        Args: { p_from_date: string; p_to_date: string; p_workspace_id: string }
        Returns: {
          ends_at: string
          id: string
          reason: string
          starts_at: string
        }[]
      }
      list_master_customer_directory: {
        Args: { p_search?: string; p_workspace_id: string }
        Returns: {
          completed_visits: number
          email: string | null
          id: string
          last_completed_visit_at: string | null
          name: string
          notes: string | null
          phone: string | null
        }[]
      }
      list_master_customer_history: {
        Args: { p_customer_id: string; p_workspace_id: string }
        Returns: {
          currency: string
          customer_id: string
          customer_name: string
          duration_minutes: number
          ends_at: string
          id: string
          paid_amount: number
          price_amount: number
          service_name: string
          source: Database["public"]["Enums"]["appointment_source"]
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      list_master_customers: {
        Args: { p_search?: string; p_workspace_id: string }
        Returns: {
          email: string
          id: string
          name: string
          phone: string
        }[]
      }
      list_master_pending_booking_requests: {
        Args: { p_workspace_id: string }
        Returns: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          duration_minutes: number
          ends_at: string
          id: string
          service_name: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      list_master_waiting_list: {
        Args: { p_workspace_id: string }
        Returns: {
          appointment_id: string
          created_at: string
          customer_email: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          desired_date: string
          desired_time_from: string
          desired_time_to: string
          duration_minutes: number
          id: string
          note: string
          service_id: string
          service_name: string
          status: Database["public"]["Enums"]["waiting_list_status"]
        }[]
      }
      list_master_waiting_list_matches: {
        Args: { p_cancelled_appointment_id: string; p_workspace_id: string }
        Returns: {
          customer_email: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          desired_date: string
          desired_time_from: string
          desired_time_to: string
          duration_minutes: number
          ends_at: string
          id: string
          note: string
          service_id: string
          service_name: string
          starts_at: string
        }[]
      }
      mark_pending_booking_emails_not_configured: {
        Args: never
        Returns: number
      }
      move_booking_request_to_waiting_list: {
        Args: { p_appointment_id: string; p_workspace_id: string }
        Returns: string
      }
      purge_expired_booking_decision_emails: { Args: never; Returns: number }
      record_customer_link_share: {
        Args: {
          p_appointment_id: string
          p_error_code?: string
          p_status: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Returns: undefined
      }
      remove_all_master_waiting_list_entries: {
        Args: { p_workspace_id: string }
        Returns: number
      }
      reschedule_appointment: {
        Args: { p_appointment_id: string; p_starts_at: string }
        Returns: Json
      }
      set_appointment_status: {
        Args: {
          p_appointment_id: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["appointment_status"]
        }
        Returns: Json
      }
      set_master_appointment_paid_amount: {
        Args: { p_appointment_id: string; p_paid_amount: number }
        Returns: Json
      }
      set_master_waiting_list_entry_status: {
        Args: {
          p_appointment_id?: string
          p_entry_id: string
          p_status: Database["public"]["Enums"]["waiting_list_status"]
          p_workspace_id: string
        }
        Returns: undefined
      }
      update_customer_appointment: {
        Args: { p_action: string; p_token: string }
        Returns: Json
      }
      update_master_waiting_list_entry: {
        Args: {
          p_customer_email?: string
          p_customer_id?: string
          p_customer_name: string
          p_customer_phone?: string
          p_desired_date: string
          p_desired_time_from?: string
          p_desired_time_to?: string
          p_entry_id: string
          p_note?: string
          p_service_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      update_master_workspace_settings: {
        Args: {
          p_end_local_time: string
          p_name: string
          p_slug: string
          p_start_local_time: string
          p_working_days: number[]
          p_workspace_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      access_token_purpose: "manage" | "cancel" | "reschedule"
      appointment_event_type:
        | "created"
        | "confirmed"
        | "rescheduled"
        | "cancelled"
        | "completed"
        | "no_show"
      appointment_source: "public_booking" | "master_created" | "imported"
      appointment_status:
        | "pending"
        | "confirmed"
        | "cancelled_by_customer"
        | "cancelled_by_master"
        | "completed"
        | "no_show"
      availability_exception_kind: "blocked" | "extra" | "modified"
      notification_channel: "email" | "push"
      notification_delivery_status:
        | "manual_required"
        | "share_sheet_opened"
        | "share_sheet_failed"
      notification_job_status:
        | "pending"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      notification_type:
        | "confirmation"
        | "reminder"
        | "cancellation"
        | "rescheduled"
      waiting_list_status: "active" | "booked" | "removed"
      workspace_role: "owner" | "admin" | "member"
      workspace_status: "active" | "paused" | "archived"
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
      access_token_purpose: ["manage", "cancel", "reschedule"],
      appointment_event_type: [
        "created",
        "confirmed",
        "rescheduled",
        "cancelled",
        "completed",
        "no_show",
      ],
      appointment_source: ["public_booking", "master_created", "imported"],
      appointment_status: [
        "pending",
        "confirmed",
        "cancelled_by_customer",
        "cancelled_by_master",
        "completed",
        "no_show",
      ],
      availability_exception_kind: ["blocked", "extra", "modified"],
      notification_channel: ["email", "push"],
      notification_delivery_status: [
        "manual_required",
        "share_sheet_opened",
        "share_sheet_failed",
      ],
      notification_job_status: [
        "pending",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      notification_type: [
        "confirmation",
        "reminder",
        "cancellation",
        "rescheduled",
      ],
      waiting_list_status: ["active", "booked", "removed"],
      workspace_role: ["owner", "admin", "member"],
      workspace_status: ["active", "paused", "archived"],
    },
  },
} as const
