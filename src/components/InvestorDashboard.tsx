import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { TrendingUp, ShoppingCart, Eye, Star, Search, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Idea, User } from '../lib/types'

interface IdeaWithAuthor extends Idea {
  author: User
  minted_user?: User | null
}

interface InvestorStats {
  totalPurchased: number
  totalInvested: number
  ownedIdeas: IdeaWithAuthor[]
  trendingIdeas: IdeaWithAuthor[]
}

export function InvestorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<InvestorStats>({
    totalPurchased: 0,
    totalInvested: 0,
    ownedIdeas: [],
    trendingIdeas: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchInvestorStats()
    }
  }, [user])

  async function fetchInvestorStats() {
    if (!user) return

    try {
      // Fetch owned ideas (purchased by user)
      const { data: ownedIdeas, error: ownedError } = await supabase
        .from('ideas')
        .select(`
          *,
          author:users!ideas_created_by_fkey(*),
          minted_user:users!ideas_minted_by_fkey(*)
        `)
        .eq('minted_by', user.id)
        .neq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (ownedError) throw ownedError

      // Fetch trending ideas (most upvoted, not owned by user)
      const { data: allIdeas, error: ideasError } = await supabase
        .from('ideas')
        .select(`
          *,
          author:users!ideas_created_by_fkey(*),
          minted_user:users!ideas_minted_by_fkey(*)
        `)
        .neq('created_by', user.id)
        .is('minted_by', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (ideasError) throw ideasError

      // Get upvote counts for trending calculation
      const { data: upvotes, error: upvotesError } = await supabase
        .from('upvotes')
        .select('idea_id')

      if (upvotesError) throw upvotesError

      // Calculate trending ideas based on upvotes
      const ideasWithUpvotes = allIdeas?.map(idea => ({
        ...idea,
        upvoteCount: upvotes?.filter(upvote => upvote.idea_id === idea.id).length || 0
      })) || []

      const trendingIdeas = ideasWithUpvotes
        .sort((a, b) => b.upvoteCount - a.upvoteCount)
        .slice(0, 5)

      setStats({
        totalPurchased: ownedIdeas?.length || 0,
        totalInvested: ownedIdeas?.length || 0, // Simplified - could be actual monetary value
        ownedIdeas: ownedIdeas || [],
        trendingIdeas: trendingIdeas || []
      })
    } catch (error) {
      console.error('Error fetching investor stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-2">
            Investor Dashboard
          </h1>
          <p className="text-gray-400">Discover and invest in promising ideas</p>
        </div>
        <Link
          to="/"
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-green-400/25 transition-all duration-300 flex items-center space-x-2"
        >
          <Search className="w-5 h-5" />
          <span>Discover Ideas</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Ideas Purchased</p>
              <p className="text-2xl font-bold text-white">{stats.totalPurchased}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Portfolio Value</p>
              <p className="text-2xl font-bold text-white">{stats.totalInvested}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">NFTs Owned</p>
              <p className="text-2xl font-bold text-white">{stats.ownedIdeas.filter(idea => idea.is_nft).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Owned Ideas */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Your Portfolio</h2>
            <Link
              to="/profile"
              className="text-green-400 hover:text-green-300 transition-colors duration-300 text-sm"
            >
              View All
            </Link>
          </div>

          {stats.ownedIdeas.length > 0 ? (
            <div className="space-y-4">
              {stats.ownedIdeas.slice(0, 3).map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg border border-green-500/30"
                >
                  {idea.image && (
                    <img
                      src={idea.image}
                      alt={idea.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">{idea.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-1">{idea.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>by @{idea.author.username}</span>
                      <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded">
                        OWNED
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No ideas purchased yet</p>
              <Link
                to="/"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-green-400/25 transition-all duration-300"
              >
                <Search className="w-4 h-4" />
                <span>Browse Ideas</span>
              </Link>
            </div>
          )}
        </div>

        {/* Trending Ideas */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Trending Ideas</h2>
            <Link
              to="/"
              className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 text-sm"
            >
              View All
            </Link>
          </div>

          {stats.trendingIdeas.length > 0 ? (
            <div className="space-y-4">
              {stats.trendingIdeas.slice(0, 3).map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50 hover:border-cyan-500/30 transition-all duration-300"
                >
                  {idea.image && (
                    <img
                      src={idea.image}
                      alt={idea.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">{idea.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-1">{idea.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>by @{idea.author.username}</span>
                      <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                        TRENDING
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No trending ideas available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}