import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { Wallet, DollarSign, TrendingUp, Download, Calendar, ArrowUpRight, ArrowDownRight, CreditCard, Building } from 'lucide-react'

interface WalletData {
  balance_cents: number
  total_earned_cents: number
  total_withdrawn_cents: number
}

interface Transaction {
  id: string
  type: 'purchase' | 'withdrawal' | 'refund'
  amount_cents: number
  description: string
  created_at: string
  idea_id?: string
}

interface WithdrawalRequest {
  id: string
  amount_cents: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  requested_at: string
  processed_at?: string
}

export function CreatorWallet() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    bankName: ''
  })

  useEffect(() => {
    if (user && profile?.role === 'creator') {
      fetchWalletData()
    }
  }, [user, profile])

  async function fetchWalletData() {
    try {
      // Fetch wallet data
      const { data: walletData, error: walletError } = await supabase
        .from('creator_wallets')
        .select('*')
        .eq('user_id', user!.id)
        .single()

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError
      }

      if (walletData) {
        setWallet(walletData)

        // Fetch transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (transactionsError) throw transactionsError
        setTransactions(transactionsData || [])

        // Fetch withdrawal requests
        const { data: withdrawalsData, error: withdrawalsError } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('requested_at', { ascending: false })
          .limit(5)

        if (withdrawalsError) throw withdrawalsError
        setWithdrawalRequests(withdrawalsData || [])
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      showToast('Failed to load wallet data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!wallet || !withdrawAmount) return

    const amountCents = Math.round(parseFloat(withdrawAmount) * 100)
    
    if (amountCents > wallet.balance_cents) {
      showToast('Insufficient balance', 'error')
      return
    }

    if (amountCents < 1000) { // Minimum $10
      showToast('Minimum withdrawal amount is $10', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          wallet_id: wallet.id,
          amount_cents: amountCents,
          bank_details: bankDetails
        })

      if (error) throw error

      showToast('Withdrawal request submitted successfully!', 'success')
      setShowWithdrawModal(false)
      setWithdrawAmount('')
      setBankDetails({
        accountNumber: '',
        routingNumber: '',
        accountHolderName: '',
        bankName: ''
      })
      fetchWalletData()
    } catch (error) {
      console.error('Error submitting withdrawal:', error)
      showToast('Failed to submit withdrawal request', 'error')
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ArrowUpRight className="w-4 h-4 text-green-400" />
      case 'withdrawal':
        return <ArrowDownRight className="w-4 h-4 text-blue-400" />
      case 'refund':
        return <ArrowDownRight className="w-4 h-4 text-red-400" />
      default:
        return <DollarSign className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20'
      case 'processing':
        return 'text-blue-400 bg-blue-500/20'
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20'
      case 'failed':
        return 'text-red-400 bg-red-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  if (profile?.role !== 'creator') {
    return null
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 text-center">
        <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Wallet will be created when you receive your first payment</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-xl border border-green-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Creator Wallet</h3>
              <p className="text-green-300/80 text-sm">Available Balance</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {formatCurrency(wallet.balance_cents)}
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={wallet.balance_cents < 1000}
              className="mt-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-green-400/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-500/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm">Total Earned</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(wallet.total_earned_cents)}
            </div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Download className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm">Total Withdrawn</span>
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(wallet.total_withdrawn_cents)}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
        
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="text-white font-medium">{transaction.description}</p>
                    <p className="text-gray-400 text-sm">{formatDate(transaction.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${transaction.type === 'purchase' ? 'text-green-400' : 'text-blue-400'}`}>
                    {transaction.type === 'purchase' ? '+' : '-'}{formatCurrency(transaction.amount_cents)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No transactions yet</p>
          </div>
        )}
      </div>

      {/* Withdrawal Requests */}
      {withdrawalRequests.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Withdrawal Requests</h3>
          
          <div className="space-y-3">
            {withdrawalRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Download className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">{formatCurrency(request.amount_cents)}</p>
                    <p className="text-gray-400 text-sm">{formatDate(request.requested_at)}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Withdraw Funds</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  min="10"
                  max={wallet.balance_cents / 100}
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <p className="text-gray-400 text-xs mt-1">
                  Available: {formatCurrency(wallet.balance_cents)} • Minimum: $10.00
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="John Doe"
                  value={bankDetails.accountHolderName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Chase Bank"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="1234567890"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Routing Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="021000021"
                    value={bankDetails.routingNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  Withdrawals are processed within 1-3 business days. Bank details are securely encrypted and stored.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || !bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.routingNumber}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg hover:shadow-lg hover:shadow-green-400/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}