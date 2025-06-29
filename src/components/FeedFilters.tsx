import React from 'react'
import { Filter, Calendar, Tag, Star } from 'lucide-react'

interface FeedFiltersProps {
  filters: {
    sortBy: 'newest' | 'oldest'
    nftStatus: 'all' | 'minted' | 'not_minted'
    selectedTag: string
  }
  onFiltersChange: (filters: any) => void
  availableTags: string[]
}

export function FeedFilters({ filters, onFiltersChange, availableTags }: FeedFiltersProps) {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* NFT Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Star className="w-4 h-4 inline mr-1" />
            NFT Status
          </label>
          <select
            value={filters.nftStatus}
            onChange={(e) => updateFilter('nftStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
          >
            <option value="all">All Ideas</option>
            <option value="minted">Minted NFTs</option>
            <option value="not_minted">Not Minted</option>
          </select>
        </div>

        {/* Tag Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Filter by Tag
          </label>
          <select
            value={filters.selectedTag}
            onChange={(e) => updateFilter('selectedTag', e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
          >
            <option value="">All Tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.selectedTag || filters.nftStatus !== 'all' || filters.sortBy !== 'newest') && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex flex-wrap gap-2">
            {filters.selectedTag && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Tag: {filters.selectedTag}
                <button
                  onClick={() => updateFilter('selectedTag', '')}
                  className="ml-2 text-cyan-300 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            {filters.nftStatus !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {filters.nftStatus === 'minted' ? 'Minted NFTs' : 'Not Minted'}
                <button
                  onClick={() => updateFilter('nftStatus', 'all')}
                  className="ml-2 text-purple-300 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            {filters.sortBy !== 'newest' && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-green-500/20 text-green-300 border border-green-500/30">
                Oldest First
                <button
                  onClick={() => updateFilter('sortBy', 'newest')}
                  className="ml-2 text-green-300 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => onFiltersChange({ sortBy: 'newest', nftStatus: 'all', selectedTag: '' })}
              className="text-sm text-gray-400 hover:text-white transition-colors duration-300"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}