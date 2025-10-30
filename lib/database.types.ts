
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
    };
    Views: {
      // Add your views here
    };
    Functions: {
      // Add your functions here
    };
  };
}
