import React, { useState } from 'react'
import { X, Handshake, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Idea, User } from '../lib/types'

interface IdeaWithAuthor extends Idea {
  author: User
}

interface PartnershipModalProps {
  idea: IdeaWithAuthor
  onClose: () => void
}

export function PartnershipModal({ idea, onClose }: PartnershipModalProps) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: profile?.username || '',
    email: user?.email || '',
    linkedinUrl: '',
    message: '',
    ndaAgreed: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // Insert collaboration request
      const { error } = await supabase
        .from('collab_requests')
        .insert({
          idea_id: idea.id,
          investor_id: user.id,
          name: formData.name,
          email: formData.email,
          linkedin_url: formData.linkedinUrl || null,
          message: formData.message
        })

      if (error) throw error

      // TODO: Send email notification to creator
      // This would typically be handled by a Supabase Edge Function
      // For now, we'll just show success message

      setSubmitted(true)
      showToast('Partnership request sent successfully!', 'success')
      
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Error submitting partnership request:', error)
      showToast('Failed to send partnership request. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full p-8 text-center">
          <div className="bg-green-500/20 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-4">Request Sent!</h3>
          <p className="text-gray-400 mb-6">
            Your partnership request has been sent to <span className="text-cyan-400">@{idea.author.username}</span>. 
            They will receive an email with your details and can respond directly to you.
          </p>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-blue-400 font-medium text-sm">Next Steps</p>
                <p className="text-blue-300/80 text-sm mt-1">
                  The creator will review your request and contact you directly if interested in collaborating.
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
                <Handshake className="w-6 h-6 text-blue-400" />
                <span>Request Partnership</span>
              </h2>
              <p className="text-gray-400">
                Collaborate on "{idea.title}" with @{idea.author.username}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Idea Preview */}
          <div className="bg-gray-700/30 rounded-xl p-4 mb-6 border border-gray-600/50">
            <div className="flex items-start space-x-3">
              {idea.image && (
                <img 
                  src={idea.image} 
                  alt={idea.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">{idea.title}</h4>
                <p className="text-gray-400 text-sm line-clamp-2">{idea.description}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-gray-500">by @{idea.author.username}</span>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Partnership
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Partnership Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium text-sm">Partnership Request</p>
                <p className="text-blue-300/80 text-sm mt-1">
                  You're requesting to collaborate on this idea, not purchasing it. The creator will retain ownership 
                  and you'll work together on development and revenue sharing.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                required
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-300 mb-2">
                LinkedIn or Portfolio URL (Optional)
              </label>
              <input
                type="url"
                id="linkedin"
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="https://linkedin.com/in/yourprofile"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                Partnership Proposal *
              </label>
              <textarea
                id="message"
                required
                rows={5}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                placeholder="Describe your background, what you bring to the partnership, and how you envision collaborating on this idea..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            {/* NDA Agreement */}
            <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  checked={formData.ndaAgreed}
                  onChange={(e) => setFormData({ ...formData, ndaAgreed: e.target.checked })}
                />
                <div className="text-sm">
                  <p className="text-white font-medium mb-1">Partnership Agreement *</p>
                  <p className="text-gray-400">
                    I understand that I'm not buying this idea, I'm requesting a partnership. 
                    I agree to respect the creator's intellectual property and discuss terms 
                    in good faith if they're interested in collaborating.
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg transition-colors duration-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name || !formData.email || !formData.message || !formData.ndaAgreed}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-400/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}