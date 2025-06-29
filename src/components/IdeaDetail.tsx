import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Star, 
  Tag, 
  Calendar, 
  Shield, 
  ShoppingCart, 
  Check, 
  X,
  GitBranch,
  User as UserIcon
} from 'lucide-react'
import type { Idea, User, Comment, Upvote } from '../lib/types'

interface IdeaWithAuthor extends Idea {
  author: User
  minted_user?: User | null
  original_idea?: IdeaWithAuthor | null
  remix_ideas?: IdeaWithAuthor[]
}

interface CommentWithAuthor extends Comment {
  author: User
}

interface IdeaDetailProps {
  idea: IdeaWithAuthor
  onClose: () => void
  onPurchase?: (idea: IdeaWithAuthor) => void
  onRemix?: (idea: IdeaWithAuthor) => void
}

export function IdeaDetail({ idea, onClose, onPurchase, onRemix }: IdeaDetailProps) {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [upvotes, setUpvotes] = useState<Upvote[]>([])
  const [userUpvoted, setUserUpvoted] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [togglingUpvote, setTogglingUpvote] = useState(false)

  useEffect(() => {
    fetchComments()
    fetchUpvotes()
  }, [idea.id])

  const canViewFullIdea = () => {
    return !idea.is_blurred || idea.created_by === user?.id || idea.minted_by === user?.id
  }

  const canPurchaseIdea = () => {
    return user && !idea.minted_by && idea.created_by !== user.id
  }

  const getMintedByDisplay = () => {
    if (!idea.minted_by) return null
    
    if (idea.minted_user) {
      return idea.minted_user.wallet_address 
        ? `${idea.minted_user.wallet_address.slice(0, 6)}...${idea.minted_user.wallet_address.slice(-4)}`
        : `@${idea.minted_user.username || 'Anonymous'}`
    }
    
    return '@Anonymous'
  }

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:users(*)
        `)
        .eq('idea_id', idea.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  async function fetchUpvotes() {
    try {
      const { data, error } = await supabase
        .from('upvotes')
        .select('*')
        .eq('idea_id', idea.id)

      if (error) throw error
      setUpvotes(data || [])
      
      if (user) {
        setUserUpvoted(data?.some(upvote => upvote.user_id === user.id) || false)
      }
    } catch (error) {
      console.error('Error fetching upvotes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitComment() {
    if (!user || !newComment.trim()) return

    setSubmittingComment(true)
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          idea_id: idea.id,
          user_id: user.id,
          comment_text: newComment.trim()
        })

      if (error) throw error

      setNewComment('')
      await fetchComments()
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleToggleUpvote() {
    if (!user || togglingUpvote) return

    setTogglingUpvote(true)
    try {
      if (userUpvoted) {
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

      await fetchUpvotes()
    } catch (error) {
      console.error('Error toggling upvote:', error)
    } finally {
      setTogglingUpvote(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{idea.title}</h2>
              
              {idea.remix_of_id && idea.original_idea && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <GitBranch className="w-4 h-4 mr-2" />
                    Remix of "{idea.original_idea.title}" by @{idea.original_idea.author.username}
                  </span>
                </div>
              )}

              {idea.minted_by && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                    <Star className="w-4 h-4 mr-2" />
                    Minted by {getMintedByDisplay()}
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-300 p-1 ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Image */}
          {idea.image && (
            <div className="aspect-video rounded-lg overflow-hidden mb-6">
              <img
                src={idea.image}
                alt={idea.title}
                className={`w-full h-full object-cover ${
                  !canViewFullIdea() ? 'blur-sm' : ''
                }`}
              />
            </div>
          )}

          {/* Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Description</h3>
              <p className={`text-gray-300 leading-relaxed ${
                !canViewFullIdea() ? 'blur-sm select-none' : ''
              }`}>
                {idea.description}
              </p>
            </div>

            {/* Tags */}
            {idea.tags && idea.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {idea.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Interaction Bar */}
            <div className="flex items-center justify-between py-4 border-y border-gray-700">
              <div className="flex items-center space-x-6">
                <button
                  onClick={handleToggleUpvote}
                  disabled={!user || togglingUpvote}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                    userUpvoted
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-red-500/20 hover:text-red-400 border border-gray-600'
                  } disabled:opacity-50`}
                >
                  <Heart className={`w-4 h-4 ${userUpvoted ? 'fill-current' : ''}`} />
                  <span>{upvotes.length}</span>
                </button>

                <div className="flex items-center space-x-2 text-gray-400">
                  <MessageCircle className="w-4 h-4" />
                  <span>{comments.length} comments</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {onRemix && user && idea.created_by !== user.id && (
                  <button
                    onClick={() => onRemix(idea)}
                    className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Remix</span>
                  </button>
                )}

                {canPurchaseIdea() && onPurchase && (
                  <button
                    onClick={() => onPurchase(idea)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400 px-4 py-2 rounded-lg transition-all duration-300 border border-green-500/30 hover:border-green-400/50"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Purchase</span>
                  </button>
                )}
              </div>
            </div>

            {/* Remix Ideas */}
            {idea.remix_ideas && idea.remix_ideas.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Remixed Ideas</h3>
                <div className="space-y-3">
                  {idea.remix_ideas.map((remix) => (
                    <div key={remix.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">{remix.title}</h4>
                          <p className="text-gray-400 text-sm line-clamp-2">{remix.description}</p>
                          <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                            <span>by @{remix.author.username}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(remix.created_at)}</span>
                          </div>
                        </div>
                        <GitBranch className="w-4 h-4 text-blue-400 ml-3 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-4">
                Comments ({comments.length})
              </h3>

              {/* Comment Form */}
              {user && (
                <div className="mb-6">
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-sm text-white font-medium flex-shrink-0">
                      {profile?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                          <span>{submittingComment ? 'Posting...' : 'Post'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-sm text-white font-medium flex-shrink-0">
                        {comment.author.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-700/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-white text-sm">
                              {comment.author.username || 'Anonymous'}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {formatRelativeTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {comment.comment_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No comments yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Author Info */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-sm text-white font-medium">
                  {idea.author.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-white font-medium">{idea.author.username || 'Anonymous'}</p>
                  <p className="text-gray-400 text-sm">{formatDate(idea.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {idea.is_nft && (
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    NFT
                  </span>
                )}
                {idea.is_blurred && (
                  <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-sm font-medium border border-orange-500/30">
                    Protected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}