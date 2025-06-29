import React from 'react'
import { Lightbulb, Zap, Brain, Rocket, Palette, Music, Leaf, Code, Camera, Heart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

const dummyIdeas = [
  {
    id: 1,
    title: "Smart Plant Monitor",
    description: "AI-powered plant care system that monitors soil moisture, light levels, and sends care reminders to your phone.",
    image: "https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Leaf,
    tags: ["IoT", "AI", "Plants"]
  },
  {
    id: 2,
    title: "AI Music Synthesizer",
    description: "Generate unique melodies and beats using machine learning algorithms trained on various music genres.",
    image: "https://images.pexels.com/photos/1751731/pexels-photo-1751731.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Music,
    tags: ["AI", "Music", "Creative"]
  },
  {
    id: 3,
    title: "Virtual Reality Fitness",
    description: "Immersive workout experiences that make exercise fun through gamification and virtual environments.",
    image: "https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Zap,
    tags: ["VR", "Fitness", "Gaming"]
  },
  {
    id: 4,
    title: "Code Learning Companion",
    description: "Interactive coding tutor that adapts to your learning style and provides personalized programming challenges.",
    image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Code,
    tags: ["Education", "Programming", "AI"]
  },
  {
    id: 5,
    title: "Mood-Based Photo Editor",
    description: "Photo editing app that automatically applies filters and effects based on the emotional content of your images.",
    image: "https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Camera,
    tags: ["Photography", "AI", "Emotions"]
  },
  {
    id: 6,
    title: "Social Impact Tracker",
    description: "Platform that helps individuals and organizations measure and visualize their positive impact on society.",
    image: "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Heart,
    tags: ["Social", "Analytics", "Impact"]
  },
  {
    id: 7,
    title: "Neural Art Generator",
    description: "Create stunning digital artwork using neural networks that blend different artistic styles and techniques.",
    image: "https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Palette,
    tags: ["AI", "Art", "Creative"]
  },
  {
    id: 8,
    title: "Space Tourism Planner",
    description: "Comprehensive platform for planning and booking commercial space flights with safety ratings and reviews.",
    image: "https://images.pexels.com/photos/586063/pexels-photo-586063.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Rocket,
    tags: ["Space", "Travel", "Future"]
  },
  {
    id: 9,
    title: "Memory Palace Builder",
    description: "Digital tool that helps you create and navigate virtual memory palaces for enhanced learning and retention.",
    image: "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Brain,
    tags: ["Memory", "Learning", "VR"]
  },
  {
    id: 10,
    title: "Sustainable City Simulator",
    description: "Urban planning game that teaches sustainable development through realistic city-building challenges.",
    image: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=500",
    icon: Lightbulb,
    tags: ["Sustainability", "Gaming", "Education"]
  }
]

interface CarouselRowProps {
  ideas: typeof dummyIdeas
  direction: 'left' | 'right'
  speed?: number
}

function CarouselRow({ ideas, direction, speed = 30 }: CarouselRowProps) {
  // Duplicate ideas for seamless loop
  const duplicatedIdeas = [...ideas, ...ideas]
  
  return (
    <div className="relative overflow-hidden">
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gray-900 to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-900 to-transparent z-10 pointer-events-none"></div>
      
      <div 
        className={`flex space-x-6 ${direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right'}`}
        style={{
          animationDuration: `${speed}s`,
          width: `${duplicatedIdeas.length * 320}px`
        }}
      >
        {duplicatedIdeas.map((idea, index) => {
          const Icon = idea.icon
          return (
            <div
              key={`${idea.id}-${index}`}
              className="flex-shrink-0 w-80 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden group hover:border-cyan-500/30 transition-all duration-300"
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={idea.image}
                  alt={idea.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300">
                    {idea.title}
                  </h3>
                  <div className="bg-gradient-to-r from-cyan-400 to-purple-500 p-2 rounded-lg flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>

                <p className="text-gray-300 mb-4 line-clamp-3 text-sm leading-relaxed">
                  {idea.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {idea.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                        {idea.title[0]}
                      </div>
                      <span>Demo Creator</span>
                    </div>
                    <span className="text-cyan-400 text-xs font-medium">PREVIEW</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LandingCarousel() {
  const { user, profile } = useAuth()
  const topRowIdeas = dummyIdeas.slice(0, 5)
  const bottomRowIdeas = dummyIdeas.slice(5, 10)

  // Determine CTA based on user role
  const getCallToAction = () => {
    if (!user) {
      return {
        text: 'Get Started',
        href: '/auth'
      }
    }

    if (profile?.role === 'investor') {
      return {
        text: 'Explore Ideas',
        href: '/'
      }
    }

    // Default for creators
    return {
      text: 'Upload an Idea',
      href: '/upload'
    }
  }

  const cta = getCallToAction()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-4">
          Discover Amazing Ideas
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Join our community of innovators and creators. Share your ideas, discover new concepts, and turn imagination into reality.
        </p>
      </div>

      {/* Top row - scrolling right to left */}
      <CarouselRow ideas={topRowIdeas} direction="left" speed={40} />
      
      {/* Bottom row - scrolling left to right */}
      <CarouselRow ideas={bottomRowIdeas} direction="right" speed={35} />

      {/* Call to action */}
      <div className="text-center mt-12">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 max-w-md mx-auto">
          <div className="bg-gradient-to-r from-cyan-400 to-purple-500 p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Lightbulb className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {user 
              ? profile?.role === 'investor' 
                ? 'Ready to Discover Ideas?' 
                : 'Ready to Share Your Ideas?'
              : 'Ready to Share Your Ideas?'
            }
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            {user
              ? profile?.role === 'investor'
                ? 'Explore innovative concepts from talented creators'
                : 'Join thousands of creators and innovators in our community'
              : 'Join thousands of creators and innovators in our community'
            }
          </p>
          <Link
            to={cta.href}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300 font-medium"
          >
            <span>{cta.text}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}