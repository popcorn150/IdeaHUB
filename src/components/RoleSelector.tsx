import React, { useState } from 'react'
import { Lightbulb, TrendingUp, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface RoleSelectorProps {
  onComplete: () => void
}

export function RoleSelector({ onComplete }: RoleSelectorProps) {
  const { user, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [selectedRole, setSelectedRole] = useState<'creator' | 'investor'>('creator')
  const [loading, setLoading] = useState(false)

  const handleRoleSelection = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      showToast(`Welcome to Idea-HUB as a ${selectedRole}!`, 'success')
      onComplete()
    } catch (error) {
      console.error('Error updating role:', error)
      showToast('Failed to update role. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    {
      id: 'creator' as const,
      title: 'Creator',
      description: 'Share your innovative ideas and build a portfolio',
      icon: Lightbulb,
      features: [
        'Upload unlimited ideas',
        'Mint ideas as NFTs',
        'Track idea performance',
        'Build your creator profile'
      ],
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      id: 'investor' as const,
      title: 'Investor',
      description: 'Discover and invest in promising ideas',
      icon: TrendingUp,
      features: [
        'Browse curated ideas',
        'Purchase promising concepts',
        'Advanced filtering tools',
        'Investment analytics'
      ],
      gradient: 'from-green-500 to-emerald-500'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-4xl w-full p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Choose Your Role
          </h2>
          <p className="text-gray-400">
            Select how you'd like to participate in the Idea-HUB community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {roles.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-cyan-500 rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={`bg-gradient-to-r ${role.gradient} p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{role.title}</h3>
                <p className="text-gray-400 mb-4">{role.description}</p>
                
                <ul className="space-y-2">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <div className="text-center">
          <button
            onClick={handleRoleSelection}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mx-auto"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Setting up...</span>
              </>
            ) : (
              <span>Continue as {selectedRole}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}