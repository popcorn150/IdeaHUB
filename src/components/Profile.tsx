import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Navigate } from 'react-router-dom'
import { Edit, Star, Eye, EyeOff, Calendar, Tag, Shield, ShoppingCart } from 'lucide-react'
import type { Idea, User } from '../lib/types'

interface IdeaWithMintedUser extends Idea {
  minted_user?: User | null
}

export function Profile() {
  const { user, profile } = useAuth()
  const [ideas, setIdeas] = useState<IdeaWithMintedUser[]>([])
  const [ownedIdeas, setOwnedIdeas] = useState<IdeaWithMintedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    username: '',
    bio: '',
    wallet_address: ''
  })

  useEffect(() => {
    if (profile) {
      setProfileData({
        username: profile.username || '',
        bio: profile.bio || '',
        wallet_address: profile.wallet_address || ''
      })
    }
  }, [profile])

  useEffect(() => {
    if (user) {
      fetchUserIdeas()
      fetchOwnedIdeas()
    }
  }, [user])

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  async function fetchUserIdeas() {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select(`
          *,
          minted_user:users!ideas_minted_by_fkey(*)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIdeas(data || [])
    } catch (error) {
      console.error('Error fetching user ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchOwnedIdeas() {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select(`
          *,
          author:users!ideas_created_by_fkey(*),
          minted_user:users!ideas_minted_by_fkey(*)
        `)
        .eq('minted_by', user.id)
        .neq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOwnedIdeas(data || [])
    } catch (error) {
      console.error('Error fetching owned ideas:', error)
    }
  }

  async function updateProfile() {
    try {
      const { error } = await supabase
        .from('users')
        .update(profileData)
        .eq('id', user.id)

      if (error) throw error
      setEditingProfile(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getMintedByDisplay = (idea: IdeaWithMintedUser) => {
    if (!idea.minted_by) return null
    
    if (idea.minted_user) {
      return idea.minted_user.wallet_address 
        ? `${idea.minted_user.wallet_address.slice(0, 6)}...${idea.minted_user.wallet_address.slice(-4)}`
        : `@${idea.minted_user.username || 'Anonymous'}`
    }
    
    return '@Anonymous'
  }

  const nftIdeas = ideas.filter(idea => idea.is_nft)
  const protectedIdeas = ideas.filter(idea => idea.is_blurred)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Profile Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-2xl text-white font-bold">
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              {editingProfile ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Username"
                    className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  />
                  <textarea
                    placeholder="Bio"
                    className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none w-full resize-none"
                    rows={2}
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Wallet Address (optional)"
                    className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none w-full"
                    value={profileData.wallet_address}
                    onChange={(e) => setProfileData({ ...profileData, wallet_address: e.target.value })}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={updateProfile}
                      className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors duration-300"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingProfile(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {profile?.username || 'Anonymous User'}
                  </h1>
                  <p className="text-gray-400 mb-2">
                    {profile?.bio || 'No bio available'}
                  </p>
                  {profile?.wallet_address && (
                    <p className="text-sm text-cyan-400 font-mono">
                      Wallet: {profile.wallet_address.slice(0, 10)}...{profile.wallet_address.slice(-4)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-300"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{ideas.length}</div>
            <div className="text-sm text-gray-400">Created Ideas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{ownedIdeas.length}</div>
            <div className="text-sm text-gray-400">Owned Ideas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{nftIdeas.length}</div>
            <div className="text-sm text-gray-400">NFTs Minted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{protectedIdeas.length}</div>
            <div className="text-sm text-gray-400">Protected Ideas</div>
          </div>
        </div>
      </div>

      {/* Owned Ideas Section */}
      {ownedIdeas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <ShoppingCart className="w-6 h-6 text-green-400" />
            <span>Owned Ideas</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedIdeas.map((idea) => (
              <div
                key={idea.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-green-500/30 hover:border-green-400/50 transition-all duration-300 overflow-hidden group"
              >
                {idea.image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={idea.image}
                      alt={idea.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-semibold text-white group-hover:text-green-400 transition-colors duration-300">
                      {idea.title}
                    </h3>
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-1 rounded-md">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Owned by you
                    </span>
                  </div>

                  <p className="text-gray-300 mb-4 line-clamp-3">
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

                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(idea.created_at)}</span>
                    </div>
                    <span className="text-green-400 text-xs font-medium">OWNED</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Created Ideas Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">My Created Ideas</h2>
        
        {loading ? (
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
        ) : ideas.length > 0 ? (
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
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300">
                      {idea.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {idea.is_nft && (
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1 rounded-md">
                          <Star className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {idea.is_blurred && (
                        <div className="bg-orange-500/20 p-1 rounded-md">
                          <Shield className="w-4 h-4 text-orange-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {idea.minted_by && idea.minted_by !== user.id && (
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                        <Star className="w-3 h-3 mr-1" />
                        Minted by {getMintedByDisplay(idea)}
                      </span>
                    </div>
                  )}

                  <p className="text-gray-300 mb-4 line-clamp-3">
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

                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(idea.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {idea.is_nft && (
                        <span className="text-purple-400 text-xs">NFT</span>
                      )}
                      {idea.is_blurred && (
                        <span className="text-orange-400 text-xs">Protected</span>
                      )}
                      {idea.minted_by && idea.minted_by !== user.id && (
                        <span className="text-purple-400 text-xs">SOLD</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-800/50 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No ideas yet</h3>
              <p className="text-gray-400 mb-4">Start sharing your innovative ideas with the world!</p>
              <a
                href="/upload"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300"
              >
                <Star className="w-4 h-4" />
                <span>Upload Your First Idea</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}