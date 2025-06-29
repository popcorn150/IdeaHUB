import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { GitBranch, Upload, Tag, Image, X, Eye, EyeOff, Star } from 'lucide-react'
import type { Idea, User } from '../lib/types'

interface IdeaWithAuthor extends Idea {
  author: User
}

interface RemixModalProps {
  originalIdea: IdeaWithAuthor
  onClose: () => void
  onSuccess: () => void
}

export function RemixModal({ originalIdea, onClose, onSuccess }: RemixModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: `Remix: ${originalIdea.title}`,
    description: originalIdea.description,
    remixChanges: '',
    tags: originalIdea.tags?.join(', ') || '',
    image: originalIdea.image || '',
    isNFT: false,
    isBlurred: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      // Combine original description with remix changes
      const fullDescription = formData.remixChanges 
        ? `${formData.description}\n\n--- REMIX CHANGES ---\n${formData.remixChanges}`
        : formData.description

      const { error } = await supabase
        .from('ideas')
        .insert({
          title: formData.title,
          description: fullDescription,
          tags: tagsArray,
          image: formData.image || null,
          is_nft: formData.isNFT,
          is_blurred: formData.isBlurred,
          created_by: user.id,
          minted_by: formData.isNFT ? user.id : null,
          remix_of_id: originalIdea.id
        })

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating remix:', error)
    } finally {
      setLoading(false)
    }
  }

  const suggestionImages = [
    'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=500',
    'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=500',
    'https://images.pexels.com/photos/355952/pexels-photo-355952.jpeg?auto=compress&cs=tinysrgb&w=500',
    'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=500'
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
                <GitBranch className="w-6 h-6 text-blue-400" />
                <span>Remix Idea</span>
              </h2>
              <p className="text-gray-400">
                Building on "{originalIdea.title}" by @{originalIdea.author.username}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Original Idea Preview */}
          <div className="bg-gray-700/30 rounded-xl p-4 mb-6 border border-gray-600/50">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Original Idea</h3>
            <div className="flex items-start space-x-3">
              {originalIdea.image && (
                <img 
                  src={originalIdea.image} 
                  alt={originalIdea.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">{originalIdea.title}</h4>
                <p className="text-gray-400 text-sm line-clamp-2">{originalIdea.description}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-gray-500">by @{originalIdea.author.username}</span>
                  {originalIdea.tags && originalIdea.tags.length > 0 && (
                    <div className="flex space-x-1">
                      {originalIdea.tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Remix Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Remix Title *
              </label>
              <input
                type="text"
                id="title"
                required
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Give your remix a unique title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Base Description
              </label>
              <textarea
                id="description"
                rows={4}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                placeholder="Modify the original description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Remix Changes */}
            <div>
              <label htmlFor="remixChanges" className="block text-sm font-medium text-gray-300 mb-2">
                What are you building on or changing? *
              </label>
              <textarea
                id="remixChanges"
                required
                rows={4}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                placeholder="Describe your improvements, modifications, or new direction..."
                value={formData.remixChanges}
                onChange={(e) => setFormData({ ...formData, remixChanges: e.target.value })}
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
                Tags
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="tags"
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter tags separated by commas"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
            </div>

            {/* Image */}
            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-300 mb-2">
                Image URL (Optional)
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="url"
                  id="image"
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="https://example.com/image.jpg"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>
              
              {/* Image Suggestions */}
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Or choose from these suggestions:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {suggestionImages.map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData({ ...formData, image: url })}
                      className="aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all duration-300"
                    >
                      <img src={url} alt={`Suggestion ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Preview */}
              {formData.image && (
                <div className="mt-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-700">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setFormData({ ...formData, image: '' })}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="absolute top-2 right-2 bg-gray-900/80 text-white p-1 rounded-full hover:bg-gray-900 transition-colors duration-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NFT Toggle */}
              <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Mint as NFT</h3>
                      <p className="text-sm text-gray-400">Make this remix tradeable</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isNFT}
                      onChange={(e) => setFormData({ ...formData, isNFT: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
                  </label>
                </div>
              </div>

              {/* Blur Toggle */}
              <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                      {formData.isBlurred ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Protect Remix</h3>
                      <p className="text-sm text-gray-400">Blur content for non-owners</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isBlurred}
                      onChange={(e) => setFormData({ ...formData, isBlurred: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-orange-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
                  </label>
                </div>
              </div>
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
                disabled={loading || !formData.title || !formData.remixChanges}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-400/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <GitBranch className="w-5 h-5" />
                <span>{loading ? 'Creating Remix...' : 'Create Remix'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}