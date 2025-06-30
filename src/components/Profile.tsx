import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Edit, Star, Eye, EyeOff, Calendar, Tag, Shield, ShoppingCart, CheckCircle, Crown, RefreshCw, AlertCircle, Camera, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Idea, User } from '../lib/types'

interface IdeaWithMintedUser extends Idea {
  minted_user?: User | null
}

export function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const [ideas, setIdeas] = useState<IdeaWithMintedUser[]>([])
  const [ownedIdeas, setOwnedIdeas] = useState<IdeaWithMintedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'working' | 'failed' | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profileData, setProfileData] = useState({
    username: '',
    bio: '',
    wallet_address: '',
    avatar_url: ''
  })

  useEffect(() => {
    if (profile) {
      setProfileData({
        username: profile.username || '',
        bio: profile.bio || '',
        wallet_address: profile.wallet_address || '',
        avatar_url: profile.avatar_url || ''
      })
    }
  }, [profile])

  useEffect(() => {
    if (user) {
      fetchUserIdeas()
      fetchOwnedIdeas()
    }
  }, [user])

  // Check for payment success and monitor webhook status
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true' && user) {
      setShowSuccessMessage(true)
      setWebhookStatus('checking')
      
      // Start monitoring for premium status update
      let attempts = 0
      const maxAttempts = 15 // 30 seconds total
      
      const checkPremiumStatus = async () => {
        // Add null check for user
        if (!user) {
          console.log('User not available, skipping premium status check')
          return false
        }

        attempts++
        console.log(`Checking premium status, attempt ${attempts}/${maxAttempts}`)
        
        await refreshProfile()
        
        // Check if user is now premium
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_premium')
          .eq('id', user.id)
          .single()
        
        if (error) {
          console.error('Error checking premium status:', error)
        } else {
          console.log('Current premium status:', userData.is_premium)
          
          if (userData.is_premium) {
            setWebhookStatus('working')
            console.log('✅ Webhook successfully updated premium status!')
            return true // Stop checking
          }
        }
        
        if (attempts >= maxAttempts) {
          setWebhookStatus('failed')
          console.log('❌ Webhook failed to update premium status after 30 seconds')
          return true // Stop checking
        }
        
        return false // Continue checking
      }
      
      // Check immediately, then every 2 seconds
      const intervalId = setInterval(async () => {
        const shouldStop = await checkPremiumStatus()
        if (shouldStop) {
          clearInterval(intervalId)
        }
      }, 2000)
      
      // Initial check
      checkPremiumStatus()
      
      // Hide success message after 15 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 15000)
      
      // Cleanup interval on unmount
      return () => clearInterval(intervalId)
    }
  }, [searchParams, refreshProfile, user])

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
      showToast('Failed to load your ideas', 'error')
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
      showToast('Failed to load owned ideas', 'error')
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error')
      return
    }

    setUploadingAvatar(true)
    try {
      // First, check if the avatars bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        throw new Error('Failed to check storage buckets')
      }

      const avatarsBucket = buckets?.find(bucket => bucket.name === 'avatars')
      
      if (!avatarsBucket) {
        throw new Error('Avatar storage is not configured. Please contact support to enable avatar uploads.')
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        if (error.message.includes('Bucket not found')) {
          throw new Error('Avatar storage is not configured. Please contact support to enable avatar uploads.')
        }
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setProfileData({ ...profileData, avatar_url: publicUrl })
      showToast('Avatar uploaded successfully!', 'success')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      
      // Provide specific error messages based on the error type
      if (error.message.includes('Avatar storage is not configured')) {
        showToast(error.message, 'error')
      } else if (error.message.includes('Bucket not found')) {
        showToast('Avatar storage is not configured. Please contact support to enable avatar uploads.', 'error')
      } else {
        showToast('Failed to upload avatar. Please try again later.', 'error')
      }
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function updateProfile() {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: profileData.username,
          bio: profileData.bio,
          wallet_address: profileData.wallet_address,
          avatar_url: profileData.avatar_url
        })
        .eq('id', user.id)

      if (error) throw error
      
      await refreshProfile()
      setEditingProfile(false)
      showToast('Profile updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating profile:', error)
      showToast('Failed to update profile', 'error')
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

  const getAvatarDisplay = () => {
    if (profileData.avatar_url) {
      return (
        <img
          src={profileData.avatar_url}
          alt="Profile"
          className="w-20 h-20 rounded-full object-cover"
        />
      )
    }
    
    return (
      <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-2xl text-white font-bold">
        {profile?.username?.[0]?.toUpperCase() || 'U'}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Payment Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">Payment Successful!</span>
          </div>
          <p className="text-green-300/80 text-sm mt-1">
            Welcome to Idea-HUB Pro! Your premium features are being activated...
          </p>
          
          {/* Webhook Status */}
          <div className="mt-3 flex items-center space-x-2">
            {webhookStatus === 'checking' && (
              <>
                <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"></div>
                <span className="text-green-300/60 text-xs">Activating premium features...</span>
              </>
            )}
            {webhookStatus === 'working' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-300/80 text-xs">Premium features activated!</span>
              </>
            )}
            {webhookStatus === 'failed' && (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-300/80 text-xs">
                  Taking longer than expected. Try refreshing the page or contact support if the issue persists.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {getAvatarDisplay()}
              {profile?.is_premium && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              )}
              {editingProfile && (
                <div className="absolute -bottom-2 -right-2">
                  <label className="bg-cyan-500 rounded-full p-2 hover:bg-cyan-600 transition-colors duration-300 cursor-pointer shadow-lg border-2 border-gray-800 flex items-center justify-center">
                    {uploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
              )}
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
                      className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors duration-300 flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Save</span>
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
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">
                      {profile?.username || 'Anonymous User'}
                    </h1>
                    {profile?.is_premium && (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                        <Crown className="w-4 h-4 mr-1" />
                        Pro Member
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      profile?.role === 'creator' 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}>
                      {profile?.role === 'creator' ? 'Creator' : 'Investor'}
                    </span>
                  </div>
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
              <Link
                to="/upload"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300"
              >
                <Star className="w-4 h-4" />
                <span>Upload Your First Idea</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}