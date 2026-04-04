export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          city: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          city?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          logo_url?: string | null;
          city?: string | null;
          is_active?: boolean;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: "admin" | "resident";
          joined_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role?: "admin" | "resident";
          joined_at?: string;
        };
        Update: {
          role?: "admin" | "resident";
        };
        Relationships: [];
      };
      residents: {
        Row: {
          id: string;
          tenant_id: string | null;
          user_id: string | null;
          name: string;
          phone: string | null;
          address: string | null;
          role: "admin" | "resident";
          balance: number;
          created_at: string;
          updated_at: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          user_id?: string | null;
          name: string;
          phone?: string | null;
          address?: string | null;
          role?: "admin" | "resident";
          balance?: number;
          created_at?: string;
          updated_at?: string | null;
          created_by?: string | null;
        };
        Update: {
          tenant_id?: string | null;
          user_id?: string | null;
          name?: string;
          phone?: string | null;
          address?: string | null;
          role?: "admin" | "resident";
          balance?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          status: "active" | "inactive" | "pending";
          role: "admin" | "moderator" | "member";
          tags: string[] | null;
          notes: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          status?: "active" | "inactive" | "pending";
          role?: "admin" | "moderator" | "member";
          tags?: string[] | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          status?: "active" | "inactive" | "pending";
          role?: "admin" | "moderator" | "member";
          tags?: string[] | null;
          notes?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          message: string;
          icon: string;
          time: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          message: string;
          icon?: string;
          time?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          action?: string;
          message?: string;
          icon?: string;
          time?: string;
          metadata?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_my_tenant_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_my_tenant_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_my_resident_role: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      member_status: "active" | "inactive" | "pending";
      member_role: "admin" | "moderator" | "member";
      resident_role: "admin" | "resident";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
