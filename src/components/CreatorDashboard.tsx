import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Lightbulb, TrendingUp, Eye, Heart, MessageCircle, Star, Calendar, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Idea } from '../lib/types'

interface IdeaStats {
  totalIdeas: number
  totalUpvotes: number
  totalComments: number
  nftsMinted: number
  recentIdeas: Idea[]
}

export function CreatorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<IdeaStats>({
    totalIdeas: 0,
    totalUpvotes: 0,
    totalComments: 0,
    nftsMinted: 0,
    recentIdeas: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchCreatorStats()
    }
  }, [user])

  async function fetchCreatorStats() {
    if (!user) return

    try {
      // Fetch user's ideas
      const { data: ideas, error: ideasError } = await supabase
        .from('ideas')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (ideasError) throw ideasError

      // Fetch upvotes for user's ideas
      const ideaIds = ideas?.map(idea => idea.id) || []
      const { data: upvotes, error: upvotesError } = await supabase
        .from('upvotes')
        .select('*')
        .in('idea_id', ideaIds)

      if (upvotesError) throw upvotesError

      // Fetch comments for user's ideas
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .in('idea_id', ideaIds)

      if (commentsError) throw commentsError

      setStats({
        totalIdeas: ideas?.length || 0,
        totalUpvotes: upvotes?.length || 0,
        totalComments: comments?.length || 0,
        nftsMinted: ideas?.filter(idea => idea.is_nft).length || 0,
        recentIdeas: ideas?.slice(0, 5) || []
      })
    } catch (error) {
      console.error('Error fetching creator stats:', error)
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
            Creator Dashboard
          </h1>
          <p className="text-gray-400">Track your ideas and engagement</p>
        </div>
        <Link
          to="/upload"
          className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Idea</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-3 rounded-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Ideas</p>
              <p className="text-2xl font-bold text-white">{stats.totalIdeas}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Upvotes</p>
              <p className="text-2xl font-bold text-white">{stats.totalUpvotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Comments</p>
              <p className="text-2xl font-bold text-white">{stats.totalComments}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">NFTs Minted</p>
              <p className="text-2xl font-bold text-white">{stats.nftsMinted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ideas */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent Ideas</h2>
          <Link
            to="/profile"
            className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 text-sm"
          >
            View All
          </Link>
        </div>

        {stats.recentIdeas.length > 0 ? (
          <div className="space-y-4">
            {stats.recentIdeas.map((idea) => (
              <div
                key={idea.id}
                className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50"
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
                  <p className="text-gray-400 text-sm line-clamp-2">{idea.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(idea.created_at)}</span>
                    </span>
                    {idea.is_nft && (
                      <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        NFT
                      </span>
                    )}
                    {idea.is_blurred && (
                      <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
                        Protected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No ideas yet</p>
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Idea</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}