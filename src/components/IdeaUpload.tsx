import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Navigate } from 'react-router-dom'
import { Upload, Tag, Eye, EyeOff, Star, Image, X } from 'lucide-react'

export function IdeaUpload() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    image: '',
    isNFT: false,
    isBlurred: false
  })

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const { error } = await supabase
        .from('ideas')
        .insert({
          title: formData.title,
          description: formData.description,
          tags: tagsArray,
          image: formData.image || null,
          is_nft: formData.isNFT,
          is_blurred: formData.isBlurred,
          created_by: user.id,
          minted_by: formData.isNFT ? user.id : null,
          remix_of_id: null
        })

      if (error) throw error

      setSuccess(true)
      setFormData({
        title: '',
        description: '',
        tags: '',
        image: '',
        isNFT: false,
        isBlurred: false
      })

      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error uploading idea:', error)
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
          Share Your Idea
        </h1>
        <p className="text-gray-400">Upload your innovative idea and optionally mint it as an NFT</p>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <p className="text-green-400">🎉 Idea uploaded successfully!</p>
        </div>
      )}

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Idea Title *
            </label>
            <input
              type="text"
              id="title"
              required
              className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
              placeholder="Enter a compelling title for your idea"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              required
              rows={5}
              className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 resize-none"
              placeholder="Describe your idea in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                placeholder="Enter tags separated by commas (e.g., tech, innovation, AI)"
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
                className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
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
                    className="aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-cyan-500 transition-all duration-300"
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
                    <p className="text-sm text-gray-400">Make this idea tradeable</p>
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
                    <h3 className="font-medium text-white">Protect Idea</h3>
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.title || !formData.description}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-400/25 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>{loading ? 'Uploading...' : 'Share Idea'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}