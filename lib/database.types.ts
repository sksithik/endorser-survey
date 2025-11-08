
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      endorser_users: {
        Row: { // The data expected from a select statement
          id: string;
          created_at: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          total_points: number;
          endorser_admin_id: string | null;
        };
        Insert: { // The data expected for an insert statement
          id?: string;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          total_points?: number;
          endorser_admin_id?: string | null;
        };
        Update: { // The data expected for an update statement
          id?: string;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          total_points?: number;
          endorser_admin_id?: string | null;
        };
      };
      endorser_admin_users: {
        Row: { // Assuming a basic structure for endorser_admin_users
          id: string;
          created_at: string;
          email: string | null;
          full_name: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
        };
      };
      reward_events: {
        Row: {
          id: string;
          created_at: string;
          user_id: string; // endorser user id
          action: string; // e.g. survey, review, video, share, redeem, referral_topup, manual
          source?: string | null; // 'auto' | 'manual' | 'referral'
          points: number; // positive or negative
          usd_value?: number | null; // cached conversion
          metadata?: Json | null; // proof links, notes, AI scores
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          action: string;
          source?: string | null;
          points: number;
          usd_value?: number | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          action?: string;
          source?: string | null;
          points?: number;
          usd_value?: number | null;
          metadata?: Json | null;
        };
      };
      point_transactions: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          delta: number; // +/- points
          balance_after: number; // resulting balance
          reward_event_id?: string | null; // link to reward_events when applicable
          reason?: string | null; // human readable note
          metadata?: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          delta: number;
          balance_after: number;
          reward_event_id?: string | null;
          reason?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          delta?: number;
          balance_after?: number;
          reward_event_id?: string | null;
          reason?: string | null;
          metadata?: Json | null;
        };
      };
      endorser_responses: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          org_slug: string;
          survey_session_id?: string | null; // link back to session
          answers: Json; // raw survey answers
          derived?: Json | null; // processed / normalized answers
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          org_slug: string;
          survey_session_id?: string | null;
          answers: Json;
          derived?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          org_slug?: string;
          survey_session_id?: string | null;
          answers?: Json;
          derived?: Json | null;
        };
      };
      referrals: {
        Row: {
          id: string;
          created_at: string;
          referrer_user_id: string;
          referral_code: string; // unique share code / link token
          lead_email?: string | null;
          lead_status?: string | null; // e.g. lead, meeting, proposal, closed_won, closed_lost
          closed_won_at?: string | null;
          bounty_points_target?: number | null; // total intended bounty at closed-won
          bounty_points_awarded?: number | null; // cumulative points awarded so far
          metadata?: Json | null; // CRM ids, notes
        };
        Insert: {
          id?: string;
          created_at?: string;
          referrer_user_id: string;
          referral_code: string;
          lead_email?: string | null;
          lead_status?: string | null;
          closed_won_at?: string | null;
          bounty_points_target?: number | null;
          bounty_points_awarded?: number | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          referrer_user_id?: string;
          referral_code?: string;
          lead_email?: string | null;
          lead_status?: string | null;
          closed_won_at?: string | null;
          bounty_points_target?: number | null;
          bounty_points_awarded?: number | null;
          metadata?: Json | null;
        };
      };
    };
    Views: {
      // Add your views here
    };
    Functions: {
      // Add your functions here
    };
  };
}
