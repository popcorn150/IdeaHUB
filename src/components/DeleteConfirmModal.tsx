import React, { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { Idea } from '../lib/types'

interface DeleteConfirmModalProps {
  idea: Idea
  onClose: () => void
  onSuccess: () => void
}

export function DeleteConfirmModal({ idea, onClose, onSuccess }: DeleteConfirmModalProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', idea.id)

      if (error) throw error

      showToast('Idea deleted successfully', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deleting idea:', error)
      showToast('Failed to delete idea. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="bg-red-500/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Delete Idea</h3>
          <p className="text-gray-400 mb-6">
            Are you sure you want to delete "{idea.title}"? This action cannot be undone.
          </p>

          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Title:</span>
              <span className="text-white font-medium">{idea.title}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-gray-400">Created:</span>
              <span className="text-white">
                {new Date(idea.created_at).toLocaleDateString()}
              </span>
            </div>
            {idea.is_nft && (
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-400">Status:</span>
                <span className="text-purple-400">NFT Minted</span>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}