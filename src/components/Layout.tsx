import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lightbulb, User, Home, PlusCircle, LogOut } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Feed', href: '/', icon: Home },
    { name: 'Upload', href: '/upload', icon: PlusCircle },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-cyan-500/20 sticky top-0 z-50">
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

            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300 hidden sm:block">
                    Hey, {profile?.username || 'User'}!
                  </span>
                  <button
                    onClick={signOut}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:block">Sign Out</span>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md border-t border-cyan-500/20">
          <div className="flex justify-around items-center py-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center space-y-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}