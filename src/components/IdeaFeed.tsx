import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Eye, EyeOff, Star, Tag, Calendar, Shield, ShoppingCart, Check, X, Heart, MessageCircle, GitBranch, DollarSign, Handshake, Users, AlertTriangle } from 'lucide-react'
import { IdeaDetail } from './IdeaDetail'
import { RemixModal } from './RemixModal'
import { PartnershipModal } from './PartnershipModal'
import { FeedFilters } from './FeedFilters'
import { LandingCarousel } from './LandingCarousel'
import type { Idea, User, OwnershipMode } from '../lib/types'

interface IdeaWithAuthor extends Idea {
  author: User
  minted_user?: User | null
  upvote_count?: number
  user_upvoted?: boolean
  comment_count?: number
}

export function IdeaFeed() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [ideas, setIdeas] = useState<IdeaWithAuthor[]>([])
  const [filteredIdeas, setFilteredIdeas] = useState<IdeaWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithAuthor | null>(null)
  const [purchaseModal, setPurchaseModal] = useState<IdeaWithAuthor | null>(null)
  const [partnershipModal, setPartnershipModal] = useState<IdeaWithAuthor | null>(null)
  const [remixModal, setRemixModal] = useState<IdeaWithAuthor | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [filters, setFilters] = useState({
    sortBy: 'newest' as 'newest' | 'oldest',
    nftStatus: 'all' as 'all' | 'minted' | 'not_minted',
    selectedTag: ''
  })

  useEffect(() => {
    if (user) {
      fetchIdeas()
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [ideas, filters])

  async function fetchIdeas() {
    try {
      const { data: ideasData, error: ideasError } = await supabase
        .from('ideas')
        .select(`
          *,
          author:users!ideas_created_by_fkey(*),
          minted_user:users!ideas_minted_by_fkey(*)
        `)
        .order('created_at', { ascending: false })

      if (ideasError) throw ideasError

      const { data: upvotesData, error: upvotesError } = await supabase
        .from('upvotes')
        .select('idea_id, user_id')

      if (upvotesError) throw upvotesError

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('idea_id')

      if (commentsError) throw commentsError

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
      showToast('Failed to load ideas', 'error')
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...ideas]

    if (filters.selectedTag) {
      filtered = filtered.filter(idea => 
        idea.tags?.some(tag => tag.toLowerCase().includes(filters.selectedTag.toLowerCase()))
      )
    }

    if (filters.nftStatus === 'minted') {
      filtered = filtered.filter(idea => idea.is_nft && idea.minted_by)
    } else if (filters.nftStatus === 'not_minted') {
      filtered = filtered.filter(idea => !idea.minted_by)
    }

    if (filters.sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    setFilteredIdeas(filtered)
  }

  const availableTags = Array.from(
    new Set(ideas.flatMap(idea => idea.tags || []))
  ).sort()

  const canViewFullIdea = (idea: IdeaWithAuthor) => {
    // Showcase ideas are always fully visible
    if (idea.ownership_mode === 'showcase') {
      return true
    }
    
    // Partnership ideas with NDA protection show partial content
    if (idea.ownership_mode === 'partnership' && idea.is_blurred) {
      return idea.created_by === user?.id || idea.minted_by === user?.id
    }
    
    // For sale ideas with blur protection
    if (idea.ownership_mode === 'forsale' && idea.is_blurred) {
      return idea.created_by === user?.id || idea.minted_by === user?.id
    }
    
    // Default: show full content if not blurred
    return !idea.is_blurred || idea.created_by === user?.id || idea.minted_by === user?.id
  }

  // Only investors can purchase ideas
  const canPurchaseIdea = (idea: IdeaWithAuthor) => {
    return user && profile?.role === 'investor' && idea.ownership_mode === 'forsale' && !idea.minted_by && idea.created_by !== user.id
  }

  // Only investors can request partnerships
  const canRequestPartnership = (idea: IdeaWithAuthor) => {
    return user && profile?.role === 'investor' && idea.ownership_mode === 'partnership' && idea.created_by !== user.id
  }

  // Only creators can remix ideas (and not their own)
  const canRemixIdea = (idea: IdeaWithAuthor) => {
    return user && profile?.role === 'creator' && idea.created_by !== user.id
  }

  const handlePurchase = async (idea: IdeaWithAuthor) => {
    if (!user) return
    
    setPurchasing(true)
    try {
      // Create Stripe checkout session with payout to creator
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId: idea.id,
          investorId: user.id,
          amount: 5000 // $50.00 in cents
        })
      })

      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create purchase session')
      }
      
      if (data.requiresOnboarding) {
        // Creator needs to complete Stripe onboarding first
        showToast('Creator needs to complete payment setup first. They will be notified.', 'info')
        setPurchaseModal(null)
        return
      }
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating purchase session:', error)
      showToast(error instanceof Error ? error.message : 'Failed to start purchase process', 'error')
    } finally {
      setPurchasing(false)
    }
  }

  const handleToggleUpvote = async (idea: IdeaWithAuthor) => {
    if (!user) {
      showToast('Please sign in to upvote ideas', 'info')
      return
    }

    try {
      if (idea.user_upvoted) {
        const { error } = await supabase
          .from('upvotes')
          .delete()
          .eq('idea_id', idea.id)
          .eq('user_id', user.id)

        if (error) throw error
        showToast('Upvote removed', 'info')
      } else {
        const { error } = await supabase
          .from('upvotes')
          .insert({
            idea_id: idea.id,
            user_id: user.id
          })

        if (error) throw error
        showToast('Idea upvoted!', 'success')
      }

      await fetchIdeas()
    } catch (error) {
      console.error('Error toggling upvote:', error)
      showToast('Failed to update upvote', 'error')
    }
  }

  const getOwnershipBadge = (ownershipMode: OwnershipMode) => {
    switch (ownershipMode) {
      case 'forsale':
        return {
          icon: DollarSign,
          text: 'For Sale',
          className: 'bg-green-500/20 text-green-300 border-green-500/30'
        }
      case 'partnership':
        return {
          icon: Handshake,
          text: 'Partnership',
          className: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        }
      case 'showcase':
        return {
          icon: Users,
          text: 'Showcase',
          className: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        }
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

  if (!user) {
    return <LandingCarousel />
  }

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
          {profile?.role === 'investor' ? 'Discover Ideas' : 'Idea Feed'}
        </h1>
        <p className="text-gray-400">
          {profile?.role === 'investor' 
            ? 'Explore innovative ideas from talented creators'
            : 'Discover innovative ideas from the community'
          }
        </p>
      </div>

      <FeedFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableTags={availableTags}
      />

      {filteredIdeas.length === 0 && !loading ? (
        <div className="text-center py-12">
          <div className="bg-gray-800/50 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No ideas found</h3>
            <p className="text-gray-400">
              {ideas.length === 0 
                ? "Be the first to share an innovative idea with the community!"
                : "Try adjusting your filters or check back later for new ideas!"
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIdeas.map((idea) => {
            const ownershipBadge = getOwnershipBadge(idea.ownership_mode)
            const OwnershipIcon = ownershipBadge.icon

            return (
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
                    <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300 flex-1">
                      {idea.title}
                    </h3>
                    <div className="flex items-center space-x-2 ml-2">
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

                  {/* Ownership Mode Badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${ownershipBadge.className}`}>
                      <OwnershipIcon className="w-3 h-3 mr-1" />
                      {ownershipBadge.text}
                      {idea.ownership_mode === 'forsale' && (
                        <span className="ml-1 text-xs">$50</span>
                      )}
                    </span>
                  </div>

                  {idea.minted_by && (
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                        <Star className="w-3 h-3 mr-1" />
                        Owned by {getMintedByDisplay(idea)}
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

                    {/* Action Buttons - Only for other people's ideas */}
                    {idea.created_by !== user?.id && (
                      <div className="space-y-2">
                        {/* Creators can only remix */}
                        {profile?.role === 'creator' && canRemixIdea(idea) && (
                          <button
                            onClick={() => setRemixModal(idea)}
                            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-3 rounded-lg transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50 flex items-center justify-center space-x-2 text-sm"
                          >
                            <GitBranch className="w-4 h-4" />
                            <span>Remix This Idea</span>
                          </button>
                        )}

                        {/* Investors can buy or request partnerships */}
                        {profile?.role === 'investor' && (
                          <div className="grid grid-cols-1 gap-2">
                            {canPurchaseIdea(idea) && (
                              <button
                                onClick={() => setPurchaseModal(idea)}
                                className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400 py-2 px-3 rounded-lg transition-all duration-300 border border-green-500/30 hover:border-green-400/50 flex items-center justify-center space-x-2 text-sm"
                              >
                                <ShoppingCart className="w-4 h-4" />
                                <span>Purchase for $50</span>
                              </button>
                            )}

                            {canRequestPartnership(idea) && (
                              <button
                                onClick={() => setPartnershipModal(idea)}
                                className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 text-blue-400 py-2 px-3 rounded-lg transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50 flex items-center justify-center space-x-2 text-sm"
                              >
                                <Handshake className="w-4 h-4" />
                                <span>Request Partnership</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Showcase only message */}
                        {idea.ownership_mode === 'showcase' && (
                          <div className="text-center py-2 text-gray-500 text-sm">
                            {profile?.role === 'creator' 
                              ? 'Showcase only - available for inspiration and remixing'
                              : 'Showcase only - not available for purchase or partnership'
                            }
                          </div>
                        )}

                        {/* No actions available message for creators on for-sale/partnership ideas */}
                        {profile?.role === 'creator' && idea.ownership_mode !== 'showcase' && !canRemixIdea(idea) && (
                          <div className="text-center py-2 text-gray-500 text-sm">
                            Available for investors only
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
                Purchase "{purchaseModal.title}" for $50. The creator will receive $45 (90%) and the platform keeps $5 (10%) as a service fee.
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-400">Idea:</span>
                  <span className="text-white font-medium">{purchaseModal.title}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-400">Creator:</span>
                  <span className="text-white">{purchaseModal.author.username || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-400">Total Price:</span>
                  <span className="text-green-400 font-bold">$50.00</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-400">Creator Receives:</span>
                  <span className="text-green-400">$45.00</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Platform Fee:</span>
                  <span className="text-gray-400">$5.00</span>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-blue-400 text-sm font-medium">Secure Payment</p>
                    <p className="text-blue-300/80 text-xs mt-1">
                      Payment is processed securely through Stripe. The creator receives their payout automatically upon successful payment.
                    </p>
                  </div>
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
                      <span>Purchase Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedIdea && (
        <IdeaDetail
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onPurchase={(idea) => {
            setSelectedIdea(null)
            setPurchaseModal(idea)
          }}
          onPartnership={(idea) => {
            setSelectedIdea(null)
            setPartnershipModal(idea)
          }}
          onRemix={(idea) => {
            setSelectedIdea(null)
            setRemixModal(idea)
          }}
        />
      )}

      {partnershipModal && (
        <PartnershipModal
          idea={partnershipModal}
          onClose={() => setPartnershipModal(null)}
        />
      )}

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