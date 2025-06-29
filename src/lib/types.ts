export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string | null
          bio: string | null
          email: string
          avatar: string | null
          wallet_address: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          bio?: string | null
          email: string
          avatar?: string | null
          wallet_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          bio?: string | null
          email?: string
          avatar?: string | null
          wallet_address?: string | null
          created_at?: string
        }
      }
      ideas: {
        Row: {
          id: string
          title: string
          description: string
          tags: string[]
          image: string | null
          is_nft: boolean
          minted_by: string | null
          is_blurred: boolean
          created_by: string
          created_at: string
          remix_of_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          tags?: string[]
          image?: string | null
          is_nft?: boolean
          minted_by?: string | null
          is_blurred?: boolean
          created_by: string
          created_at?: string
          remix_of_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          tags?: string[]
          image?: string | null
          is_nft?: boolean
          minted_by?: string | null
          is_blurred?: boolean
          created_by?: string
          created_at?: string
          remix_of_id?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          idea_id: string
          user_id: string
          comment_text: string
          created_at: string
        }
        Insert: {
          id?: string
          idea_id: string
          user_id: string
          comment_text: string
          created_at?: string
        }
        Update: {
          id?: string
          idea_id?: string
          user_id?: string
          comment_text?: string
          created_at?: string
        }
      }
      upvotes: {
        Row: {
          idea_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          idea_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          idea_id?: string
          user_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Idea = Database['public']['Tables']['ideas']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Upvote = Database['public']['Tables']['upvotes']['Row']