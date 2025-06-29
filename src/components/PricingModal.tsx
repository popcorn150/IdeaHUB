import React, { useState } from 'react'
import { X, Check, Crown, Zap, Infinity, AlertTriangle } from 'lucide-react'
import { STRIPE_CONFIG } from '../lib/stripe-config'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface PricingModalProps {
  onClose: () => void
}

export function PricingModal({ onClose }: PricingModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (planKey: keyof typeof STRIPE_CONFIG.products) => {
    if (!user) return

    setLoading(planKey)
    setError(null)
    
    try {
      // Create Stripe checkout session
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: STRIPE_CONFIG.products[planKey].priceId,
          userId: user.id,
          planType: planKey
        })
      })

      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      setError(error instanceof Error ? error.message : 'Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const plans = [
    {
      key: 'monthly' as const,
      icon: Zap,
      popular: false,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      key: 'quarterly' as const,
      icon: Crown,
      popular: true,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      key: 'lifetime' as const,
      icon: Infinity,
      popular: false,
      gradient: 'from-green-500 to-emerald-500'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Choose Your Plan
              </h2>
              <p className="text-gray-400 mt-2">
                Unlock premium features and protect your ideas
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-300 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-medium">Payment Error</span>
              </div>
              <p className="text-red-300/80 text-sm mt-1">{error}</p>
              {error.includes('live mode key') && (
                <p className="text-red-300/60 text-xs mt-2">
                  This is a configuration issue. Please contact support or try again later.
                </p>
              )}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(({ key, icon: Icon, popular, gradient }) => {
              const plan = STRIPE_CONFIG.products[key]
              const isLoading = loading === key
              
              return (
                <div
                  key={key}
                  className={`relative bg-gray-700/50 rounded-2xl p-6 border transition-all duration-300 hover:scale-105 ${
                    popular 
                      ? 'border-purple-500/50 shadow-lg shadow-purple-500/25' 
                      : 'border-gray-600/50 hover:border-cyan-500/30'
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`bg-gradient-to-r ${gradient} p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      {plan.interval !== 'lifetime' && (
                        <span className="text-gray-400">/{plan.interval}</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe(key)}
                    disabled={isLoading}
                    className={`w-full bg-gradient-to-r ${gradient} text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Get Started</span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Test Mode Notice */}
          <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-yellow-400 font-medium">Test Mode</span>
            </div>
            <p className="text-yellow-300/80 text-sm mt-1">
              Use test card: <code className="bg-gray-700 px-2 py-1 rounded">4242 4242 4242 4242</code> with any future expiry date
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}