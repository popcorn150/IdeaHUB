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
          avatar_url: string | null
          wallet_address: string | null
          created_at: string
          is_premium: boolean
          role: 'creator' | 'investor'
        }
        Insert: {
          id: string
          username?: string | null
          bio?: string | null
          email: string
          avatar?: string | null
          avatar_url?: string | null
          wallet_address?: string | null
          created_at?: string
          is_premium?: boolean
          role?: 'creator' | 'investor'
        }
        Update: {
          id?: string
          username?: string | null
          bio?: string | null
          email?: string
          avatar?: string | null
          avatar_url?: string | null
          wallet_address?: string | null
          created_at?: string
          is_premium?: boolean
          role?: 'creator' | 'investor'
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
          ownership_mode: 'forsale' | 'partnership' | 'showcase'
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
          ownership_mode?: 'forsale' | 'partnership' | 'showcase'
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
          ownership_mode?: 'forsale' | 'partnership' | 'showcase'
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
      collab_requests: {
        Row: {
          id: string
          idea_id: string
          investor_id: string
          name: string
          email: string
          linkedin_url: string | null
          message: string
          accepted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          idea_id: string
          investor_id: string
          name: string
          email: string
          linkedin_url?: string | null
          message: string
          accepted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          idea_id?: string
          investor_id?: string
          name?: string
          email?: string
          linkedin_url?: string | null
          message?: string
          accepted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      stripe_payout_accounts: {
        Row: {
          id: number
          user_id: string
          stripe_account_id: string | null
          account_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          stripe_account_id?: string | null
          account_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          stripe_account_id?: string | null
          account_enabled?: boolean
          created_at?: string
          updated_at?: string
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
export type CollabRequest = Database['public']['Tables']['collab_requests']['Row']
export type StripePayoutAccount = Database['public']['Tables']['stripe_payout_accounts']['Row']

export type OwnershipMode = 'forsale' | 'partnership' | 'showcase'