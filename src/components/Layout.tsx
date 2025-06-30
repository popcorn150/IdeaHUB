import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lightbulb, User, Home, PlusCircle, LogOut, Crown, BarChart3, TrendingUp, Menu, X } from 'lucide-react'
import { PricingModal } from './PricingModal'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const [showPricing, setShowPricing] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getNavigation = () => {
    if (!user || !profile) return []
    
    const baseNav = [
      { name: 'Feed', href: '/', icon: Home },
    ]
    
    if (profile.role === 'creator') {
      return [
        ...baseNav,
        { name: 'Dashboard', href: '/dashboard/creator', icon: BarChart3 },
        { name: 'Upload', href: '/upload', icon: PlusCircle },
        { name: 'Profile', href: '/profile', icon: User },
      ]
    } else {
      // Investors don't get upload functionality
      return [
        ...baseNav,
        { name: 'Dashboard', href: '/dashboard/investor', icon: TrendingUp },
        { name: 'Profile', href: '/profile', icon: User },
      ]
    }
  }

  const navigation = getNavigation()

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-cyan-500/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="bg-gradient-to-r from-cyan-400 to-purple-500 p-2 rounded-lg group-hover:shadow-lg group-hover:shadow-cyan-400/25 transition-all duration-300">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Idea-HUB
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-400/25'
                        : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  {/* Premium Status / Upgrade Button */}
                  {profile?.is_premium ? (
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 px-4 py-2 rounded-lg border border-purple-500/30 shadow-lg shadow-purple-400/25">
                      <Crown className="w-4 h-4" />
                      <span className="text-sm font-medium">Pro Member</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPricing(true)}
                      className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-300"
                    >
                      <Crown className="w-4 h-4" />
                      <span className="hidden sm:block">Upgrade to Pro</span>
                    </button>
                  )}

                  <span className="text-gray-300 hidden lg:block">
                    Hey, {profile?.username || 'User'}!
                  </span>
                  <button
                    onClick={signOut}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:block">Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-300 hover:text-white transition-colors duration-300"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {user && mobileMenuOpen && (
          <div className="md:hidden bg-gray-800/95 backdrop-blur-md border-t border-gray-700">
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              <div className="border-t border-gray-700 pt-4 mt-4">
                {profile?.is_premium ? (
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 px-3 py-2 rounded-lg border border-purple-500/30">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-medium">Pro Member</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowPricing(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-2 rounded-lg hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-300"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Upgrade to Pro</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    signOut()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Pricing Modal */}
      {showPricing && (
        <PricingModal onClose={() => setShowPricing(false)} />
      )}
    </div>
  )
}