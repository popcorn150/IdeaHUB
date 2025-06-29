import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Star, Tag, Calendar, Shield, ShoppingCart, Check, X, Heart, MessageCircle, GitBranch } from 'lucide-react'
import { IdeaDetail } from './IdeaDetail'
import { RemixModal } from './RemixModal'
import { LandingCarousel } from './LandingCarousel'
import type { Idea, User } from '../lib/types'

interface IdeaWithAuthor extends Idea {
  author: User
  minted_user?: User | null
  upvote_count?: number
  user_upvoted?: boolean
  comment_count?: number
}

export function IdeaFeed() {
  const { user, profile } = useAuth()
  const [ideas, setIdeas] = useState<IdeaWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithAuthor | null>(null)
  const [purchaseModal, setPurchaseModal] = useState<IdeaWithAuthor | null>(null)
  const [remixModal, setRemixModal] = useState<IdeaWithAuthor | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    fetchIdeas()
  }, [user])

  async function fetchIdeas() {
    try {
      // Fetch ideas with author, minted user, and interaction counts
      const { data: ideasData, error: ideasError } = await supabase
        .from('ideas')
        .select(`
          *,
          author:users!ideas_created_by_fkey(*),
          minted_user:users!ideas_minted_by_fkey(*)
        `)
        .order('created_at', { ascending: false })

      if (ideasError) throw ideasError

      // Fetch upvote counts and user upvotes
      const { data: upvotesData, error: upvotesError } = await supabase
        .from('upvotes')
        .select('idea_id, user_id')

      if (upvotesError) throw upvotesError

      // Fetch comment counts
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('idea_id')

      if (commentsError) throw commentsError

      // Process the data
      const ideasWithInteractions = ideasData?.map(idea => {
        const upvotes = upvotesData?.filter(upvote => upvote.idea_id === idea.id) || []
        const comments = commentsData?.filter(comment => comment.idea_id === idea.id) || []
        
        return {
          ...idea,
          upvote_count: upvotes.length,
          user_upvoted: user ? upvotes.some(upvote => upvote.user_id === user.id) : false,
          comment_count: comments.length
        }
      }) || []

      setIdeas(ideasWithInteractions)
    } catch (error) {
      console.error('Error fetching ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  const canViewFullIdea = (idea: IdeaWithAuthor) => {
    return !idea.is_blurred || idea.created_by === user?.id || idea.minted_by === user?.id
  }

  const canPurchaseIdea = (idea: IdeaWithAuthor) => {
    return user && !idea.minted_by && idea.created_by !== user.id
  }

  const handlePurchase = async (idea: IdeaWithAuthor) => {
    if (!user) return
    
    setPurchasing(true)
    try {
      const { error } = await supabase
        .from('ideas')
        .update({
          is_nft: true,
          minted_by: user.id
        })
        .eq('id', idea.id)

      if (error) throw error

      // Refresh ideas to show updated state
      await fetchIdeas()
      setPurchaseModal(null)
    } catch (error) {
      console.error('Error purchasing idea:', error)
    } finally {
      setPurchasing(false)
    }
  }

  const handleToggleUpvote = async (idea: IdeaWithAuthor) => {
    if (!user) return

    try {
      if (idea.user_upvoted) {
        const { error } = await supabase
          .from('upvotes')
          .delete()
          .eq('idea_id', idea.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('upvotes')
          .insert({
            idea_id: idea.id,
            user_id: user.id
          })

        if (error) throw error
      }

      // Refresh ideas to show updated state
      await fetchIdeas()
    } catch (error) {
      console.error('Error toggling upvote:', error)
    }
  }

  const getMintedByDisplay = (idea: IdeaWithAuthor) => {
    if (!idea.minted_by) return null
    
    if (idea.minted_user) {
      return idea.minted_user.wallet_address 
        ? `${idea.minted_user.wallet_address.slice(0, 6)}...${idea.minted_user.wallet_address.slice(-4)}`
        : `@${idea.minted_user.username || 'Anonymous'}`
    }
    
    return '@Anonymous'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Show landing carousel if user is not logged in or no ideas exist
  const showLandingCarousel = !user || ideas.length === 0

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (showLandingCarousel) {
    return <LandingCarousel />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
          Idea Feed
        </h1>
        <p className="text-gray-400">Discover innovative ideas from the community</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden group"
          >
            {idea.image && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={idea.image}
                  alt={idea.title}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                    !canViewFullIdea(idea) ? 'blur-sm' : ''
                  }`}
                />
              </div>
            )}
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300">
                  {idea.title}
                </h3>
                <div className="flex items-center space-x-2">
                  {idea.remix_of_id && (
                    <div className="bg-blue-500/20 p-1 rounded-md">
                      <GitBranch className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                  {idea.is_nft && (
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1 rounded-md">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {idea.is_blurred && !canViewFullIdea(idea) && (
                    <div className="bg-orange-500/20 p-1 rounded-md">
                      <Shield className="w-4 h-4 text-orange-400" />
                    </div>
                  )}
                </div>
              </div>

              {idea.minted_by && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                    <Star className="w-3 h-3 mr-1" />
                    Minted by {getMintedByDisplay(idea)}
                  </span>
                </div>
              )}

              <p className={`text-gray-300 mb-4 line-clamp-3 ${
                !canViewFullIdea(idea) ? 'blur-sm select-none' : ''
              }`}>
                {idea.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {idea.tags?.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {idea.tags && idea.tags.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{idea.tags.length - 3} more
                  </span>
                )}
              </div>

              {/* Interaction Bar */}
              <div className="flex items-center justify-between mb-4 text-sm">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleToggleUpvote(idea)}
                    disabled={!user}
                    className={`flex items-center space-x-1 transition-colors duration-300 ${
                      idea.user_upvoted
                        ? 'text-red-400'
                        : 'text-gray-400 hover:text-red-400'
                    } disabled:opacity-50`}
                  >
                    <Heart className={`w-4 h-4 ${idea.user_upvoted ? 'fill-current' : ''}`} />
                    <span>{idea.upvote_count || 0}</span>
                  </button>

                  <div className="flex items-center space-x-1 text-gray-400">
                    <MessageCircle className="w-4 h-4" />
                    <span>{idea.comment_count || 0}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-gray-400">
                  <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {idea.author.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs">{idea.author.username || 'Anonymous'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setSelectedIdea(idea)}
                  className="w-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-400 py-2 px-4 rounded-lg transition-all duration-300 border border-cyan-500/30 hover:border-cyan-400/50"
                >
                  {canViewFullIdea(idea) ? (
                    <span className="flex items-center justify-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <EyeOff className="w-4 h-4" />
                      <span>Premium Content</span>
                    </span>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {user && idea.created_by !== user.id && (
                    <button
                      onClick={() => setRemixModal(idea)}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-3 rounded-lg transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50 flex items-center justify-center space-x-2 text-sm"
                    >
                      <GitBranch className="w-4 h-4" />
                      <span>Remix</span>
                    </button>
                  )}

                  {canPurchaseIdea(idea) && (
                    <button
                      onClick={() => setPurchaseModal(idea)}
                      className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400 py-2 px-3 rounded-lg transition-all duration-300 border border-green-500/30 hover:border-green-400/50 flex items-center justify-center space-x-2 text-sm"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Buy</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Confirmation Modal */}
      {purchaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Purchase Idea</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to purchase "{purchaseModal.title}"? This will mint it as an NFT and transfer ownership to you.
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Idea:</span>
                  <span className="text-white font-medium">{purchaseModal.title}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-400">Creator:</span>
                  <span className="text-white">{purchaseModal.author.username || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-400">Will be minted by:</span>
                  <span className="text-cyan-400">
                    {profile?.wallet_address 
                      ? `${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)}`
                      : `@${profile?.username || 'You'}`
                    }
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setPurchaseModal(null)}
                  disabled={purchasing}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePurchase(purchaseModal)}
                  disabled={purchasing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg hover:shadow-lg hover:shadow-green-400/25 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {purchasing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Purchase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <IdeaDetail
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onPurchase={(idea) => {
            setSelectedIdea(null)
            setPurchaseModal(idea)
          }}
          onRemix={(idea) => {
            setSelectedIdea(null)
            setRemixModal(idea)
          }}
        />
      )}

      {/* Remix Modal */}
      {remixModal && (
        <RemixModal
          originalIdea={remixModal}
          onClose={() => setRemixModal(null)}
          onSuccess={fetchIdeas}
        />
      )}
    </div>
  )
}