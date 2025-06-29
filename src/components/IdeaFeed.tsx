import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Eye, EyeOff, Star, Tag, Calendar, Shield, ShoppingCart, Check, X, Heart, MessageCircle, GitBranch, Edit, Trash2 } from 'lucide-react'
import { IdeaDetail } from './IdeaDetail'
import { RemixModal } from './RemixModal'
import { EditIdeaModal } from './EditIdeaModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { FeedFilters } from './FeedFilters'
import { LandingCarousel } from './LandingCarousel'
import type { Idea, User } from '../lib/types'

interface IdeaWithAuthor extends Idea {
  author: User
  minted_user?: User | null
  upvote_count?: number
  user_upvoted?: boolean
  comment_count?: number
}

// Dummy data for demonstration
const dummyIdeasData: IdeaWithAuthor[] = [
  {
    id: 'dummy-1',
    title: "Smart Plant Monitor",
    description: "AI-powered plant care system that monitors soil moisture, light levels, and sends care reminders to your phone. Perfect for busy plant parents who want to keep their green friends healthy.",
    tags: ["IoT", "AI", "Plants", "Smart Home"],
    image: "https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=500",
    is_nft: false,
    minted_by: null,
    is_blurred: false,
    created_by: 'dummy-user-1',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    remix_of_id: null,
    author: {
      id: 'dummy-user-1',
      username: 'plantlover',
      bio: 'IoT enthusiast and plant parent',
      email: 'plant@example.com',
      avatar: null,
      avatar_url: null,
      wallet_address: null,
      created_at: new Date().toISOString(),
      is_premium: false,
      role: 'creator'
    },
    upvote_count: 24,
    user_upvoted: false,
    comment_count: 8
  },
  {
    id: 'dummy-2',
    title: "AI Music Synthesizer",
    description: "Generate unique melodies and beats using machine learning algorithms trained on various music genres. Create professional-quality music without any musical background.",
    tags: ["AI", "Music", "Creative", "Machine Learning"],
    image: "https://images.pexels.com/photos/1751731/pexels-photo-1751731.jpeg?auto=compress&cs=tinysrgb&w=500",
    is_nft: true,
    minted_by: 'dummy-user-2',
    is_blurred: false,
    created_by: 'dummy-user-3',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    remix_of_id: null,
    author: {
      id: 'dummy-user-3',
      username: 'musicmaker',
      bio: 'AI researcher and music producer',
      email: 'music@example.com',
      avatar: null,
      avatar_url: null,
      wallet_address: null,
      created_at: new Date().toISOString(),
      is_premium: true,
      role: 'creator'
    },
    minted_user: {
      id: 'dummy-user-2',
      username: 'investor1',
      bio: 'Music industry investor',
      email: 'investor@example.com',
      avatar: null,
      avatar_url: null,
      wallet_address: '0x1234...5678',
      created_at: new Date().toISOString(),
      is_premium: true,
      role: 'investor'
    },
    upvote_count: 42,
    user_upvoted: false,
    comment_count: 15
  },
  {
    id: 'dummy-3',
    title: "Virtual Reality Fitness",
    description: "Immersive workout experiences that make exercise fun through gamification and virtual environments. Turn your living room into a gym, adventure course, or sports arena.",
    tags: ["VR", "Fitness", "Gaming", "Health"],
    image: "https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=500",
    is_nft: false,
    minted_by: null,
    is_blurred: true,
    created_by: 'dummy-user-4',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    remix_of_id: null,
    author: {
      id: 'dummy-user-4',
      username: 'fitnessguru',
      bio: 'VR developer and fitness enthusiast',
      email: 'fitness@example.com',
      avatar: null,
      avatar_url: null,
      wallet_address: null,
      created_at: new Date().toISOString(),
      is_premium: true,
      role: 'creator'
    },
    upvote_count: 18,
    user_upvoted: false,
    comment_count: 6
  },
  {
    id: 'dummy-4',
    title: "Code Learning Companion",
    description: "Interactive coding tutor that adapts to your learning style and provides personalized programming challenges. Learn to code with AI-powered guidance and real-time feedback.",
    tags: ["Education", "Programming", "AI", "Learning"],
    image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=500",
    is_nft: false,
    minted_by: null,
    is_blurred: false,
    created_by: 'dummy-user-5',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    remix_of_id: null,
    author: {
      id: 'dummy-user-5',
      username: 'codeteacher',
      bio: 'Software engineer and educator',
      email: 'code@example.com',
      avatar: null,
      avatar_url: null,
      wallet_address: null,
      created_at: new Date().toISOString(),
      is_premium: false,
      role: 'creator'
    },
    upvote_count: 31,
    user_upvoted: false,
    comment_count: 12
  },
  {
    id: 'dummy-5',
    title: "Mood-Based Photo Editor",
    description: "Photo editing app that automatically applies filters and effects based on the emotional content of your images. AI analyzes facial expressions and scene context for perfect edits.",
    tags: ["Photography", "AI", "Emotions", "Mobile App"],
    image: "https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=500",
    is_nft: false,
    minted_by: null,
    is_blurred: false,
    created_by: 'dummy-user-6',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    remix_of_id: null,
    author: {
      id: 'dummy-user-6',
      username: 'photowiz',
      bio: 'Photographer and AI enthusiast',
      email: 'photo@example.com',
      avatar: null,
      avatar_url: null,
      wallet_address: null,
      created_at: new Date().toISOString(),
      is_premium: false,
      role: 'creator'
    },
    upvote_count: 27,
    user_upvoted: false,
    comment_count: 9
  },
  {
    id: 'dummy-6',
    title: "Social Impact Tracker",
    description: "Platform that helps individuals and organizations measure and visualize their positive impact on society. Track volunteer hours, donations, and community contributions.",
    tags: ["Social", "Analytics", "Impact", "Community"],
    image: "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=500",
    is_nft: true,
    minted_by: 'dummy-user-7',
    is_blurred: false,
    created_by: 'dummy-user-8',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    remix_of_id: null,
    author: {
      id: 'dummy-user-8',
      username: 'socialchanger',
      bio: 'Social entrepreneur and activist',
      email: 'social@example.com',
      avatar: null,
      avatar_url: null,
      wallet_address: null,
      created_at: new Date().toISOString(),
      is_premium: true,
      role: 'creator'
    },
    minted_user: {
      id: 'dummy-user-7',
      username: 'impactinvestor',
      bio: 'Social impact investor',
      email: 'impact@example.com',
      avatar: null,
      avatar_url: null,
      wallet_address: '0xabcd...efgh',
      created_at: new Date().toISOString(),
      is_premium: true,
      role: 'investor'
    },
    upvote_count: 35,
    user_upvoted: false,
    comment_count: 18
  }
]

export function IdeaFeed() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [ideas, setIdeas] = useState<IdeaWithAuthor[]>([])
  const [filteredIdeas, setFilteredIdeas] = useState<IdeaWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithAuthor | null>(null)
  const [purchaseModal, setPurchaseModal] = useState<IdeaWithAuthor | null>(null)
  const [remixModal, setRemixModal] = useState<IdeaWithAuthor | null>(null)
  const [editModal, setEditModal] = useState<IdeaWithAuthor | null>(null)
  const [deleteModal, setDeleteModal] = useState<IdeaWithAuthor | null>(null)
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
      // For non-logged in users, show landing carousel
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [ideas, filters])

  async function fetchIdeas() {
    try {
      // Fetch real ideas with author, minted user, and interaction counts
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

      // Process the real data
      const realIdeasWithInteractions = ideasData?.map(idea => {
        const upvotes = upvotesData?.filter(upvote => upvote.idea_id === idea.id) || []
        const comments = commentsData?.filter(comment => comment.idea_id === idea.id) || []
        
        return {
          ...idea,
          upvote_count: upvotes.length,
          user_upvoted: user ? upvotes.some(upvote => upvote.user_id === user.id) : false,
          comment_count: comments.length
        }
      }) || []

      // Combine real ideas with dummy data, with real ideas taking precedence
      const combinedIdeas = [...realIdeasWithInteractions, ...dummyIdeasData]
      setIdeas(combinedIdeas)
    } catch (error) {
      console.error('Error fetching ideas:', error)
      // If there's an error fetching real ideas, just show dummy data
      setIdeas(dummyIdeasData)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...ideas]

    // Filter by tag
    if (filters.selectedTag) {
      filtered = filtered.filter(idea => 
        idea.tags?.some(tag => tag.toLowerCase().includes(filters.selectedTag.toLowerCase()))
      )
    }

    // Filter by NFT status
    if (filters.nftStatus === 'minted') {
      filtered = filtered.filter(idea => idea.is_nft && idea.minted_by)
    } else if (filters.nftStatus === 'not_minted') {
      filtered = filtered.filter(idea => !idea.minted_by)
    }

    // Sort
    if (filters.sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    setFilteredIdeas(filtered)
  }

  // Get all unique tags for filter dropdown
  const availableTags = Array.from(
    new Set(ideas.flatMap(idea => idea.tags || []))
  ).sort()

  const canViewFullIdea = (idea: IdeaWithAuthor) => {
    return !idea.is_blurred || idea.created_by === user?.id || idea.minted_by === user?.id
  }

  const canPurchaseIdea = (idea: IdeaWithAuthor) => {
    return user && !idea.minted_by && idea.created_by !== user.id && !idea.id.startsWith('dummy-')
  }

  const canEditIdea = (idea: IdeaWithAuthor) => {
    return user && idea.created_by === user.id && !idea.id.startsWith('dummy-')
  }

  const canRemixIdea = (idea: IdeaWithAuthor) => {
    return user && idea.created_by !== user.id && !idea.id.startsWith('dummy-')
  }

  const handlePurchase = async (idea: IdeaWithAuthor) => {
    if (!user || idea.id.startsWith('dummy-')) return
    
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

      showToast('Idea purchased successfully!', 'success')
      await fetchIdeas()
      setPurchaseModal(null)
    } catch (error) {
      console.error('Error purchasing idea:', error)
      showToast('Failed to purchase idea', 'error')
    } finally {
      setPurchasing(false)
    }
  }

  const handleToggleUpvote = async (idea: IdeaWithAuthor) => {
    if (!user || idea.id.startsWith('dummy-')) {
      showToast('This is demo data. Sign up to interact with real ideas!', 'info')
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

  // Show landing carousel only if user is not logged in
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

      {/* Filters */}
      <FeedFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableTags={availableTags}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIdeas.map((idea) => (
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
                  {idea.id.startsWith('dummy-') && (
                    <div className="bg-cyan-500/20 p-1 rounded-md">
                      <span className="text-xs text-cyan-400 font-medium px-1">DEMO</span>
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
                  {canEditIdea(idea) ? (
                    <>
                      <button
                        onClick={() => setEditModal(idea)}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-3 rounded-lg transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50 flex items-center justify-center space-x-2 text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteModal(idea)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-3 rounded-lg transition-all duration-300 border border-red-500/30 hover:border-red-400/50 flex items-center justify-center space-x-2 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {canRemixIdea(idea) && profile?.role === 'creator' && (
                        <button
                          onClick={() => idea.id.startsWith('dummy-') ? showToast('This is demo data. Upload real ideas to remix!', 'info') : setRemixModal(idea)}
                          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-3 rounded-lg transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50 flex items-center justify-center space-x-2 text-sm"
                        >
                          <GitBranch className="w-4 h-4" />
                          <span>Remix</span>
                        </button>
                      )}

                      {canPurchaseIdea(idea) && profile?.role === 'investor' && (
                        <button
                          onClick={() => setPurchaseModal(idea)}
                          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400 py-2 px-3 rounded-lg transition-all duration-300 border border-green-500/30 hover:border-green-400/50 flex items-center justify-center space-x-2 text-sm"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Buy</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredIdeas.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="bg-gray-800/50 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No ideas found</h3>
            <p className="text-gray-400">Try adjusting your filters or check back later for new ideas!</p>
          </div>
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
            if (!idea.id.startsWith('dummy-')) {
              setPurchaseModal(idea)
            } else {
              showToast('This is demo data. Sign up to purchase real ideas!', 'info')
            }
          }}
          onRemix={(idea) => {
            setSelectedIdea(null)
            if (!idea.id.startsWith('dummy-')) {
              setRemixModal(idea)
            } else {
              showToast('This is demo data. Upload real ideas to remix!', 'info')
            }
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

      {/* Edit Modal */}
      {editModal && (
        <EditIdeaModal
          idea={editModal}
          onClose={() => setEditModal(null)}
          onSuccess={fetchIdeas}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmModal
          idea={deleteModal}
          onClose={() => setDeleteModal(null)}
          onSuccess={fetchIdeas}
        />
      )}
    </div>
  )
}