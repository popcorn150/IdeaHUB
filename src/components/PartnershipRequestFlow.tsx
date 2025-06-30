import React, { useState } from 'react'
import { X, FileText, DollarSign, Send, CheckCircle, AlertTriangle, Scroll, PenTool } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Idea, User } from '../lib/types'

interface IdeaWithAuthor extends Idea {
  author: User
}

interface PartnershipRequestFlowProps {
  idea: IdeaWithAuthor
  onClose: () => void
  onSuccess?: () => void
}

type FlowStep = 'nda' | 'payment' | 'message' | 'success'

const NDA_TEXT = `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into between the Creator of the idea "[IDEA_TITLE_PLACEHOLDER]" ("Disclosing Party") and the undersigned investor ("Receiving Party").

1. CONFIDENTIAL INFORMATION
The Disclosing Party may share confidential and proprietary information related to their business idea, including but not limited to:
- Business plans and strategies
- Technical specifications and implementations
- Market research and analysis
- Financial projections and models
- Customer lists and market data
- Any other proprietary information marked as confidential

2. OBLIGATIONS OF RECEIVING PARTY
The Receiving Party agrees to:
- Keep all confidential information strictly confidential
- Not disclose any confidential information to third parties
- Use the information solely for the purpose of evaluating potential collaboration
- Not use the information for any competitive purposes
- Return or destroy all confidential materials upon request

3. TERM
This Agreement shall remain in effect for a period of 2 years from the date of signing, unless terminated earlier by mutual consent.

4. REMEDIES
The Receiving Party acknowledges that any breach of this Agreement may cause irreparable harm to the Disclosing Party, and that monetary damages may be inadequate. Therefore, the Disclosing Party shall be entitled to seek injunctive relief and other equitable remedies.

5. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction where the Disclosing Party resides.

By signing below, both parties acknowledge that they have read, understood, and agree to be bound by the terms of this Agreement.
`

export function PartnershipRequestFlow({ idea, onClose, onSuccess }: PartnershipRequestFlowProps) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [currentStep, setCurrentStep] = useState<FlowStep>('nda')
  const [loading, setLoading] = useState(false)
  const [signature, setSignature] = useState('')
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [formData, setFormData] = useState({
    fullName: profile?.username || '',
    email: user?.email || '',
    message: ''
  })

  const handleNDASubmit = async () => {
    if (!signature.trim()) {
      showToast('Please provide your digital signature', 'error')
      return
    }

    setCurrentStep('payment')
  }

  const handlePayment = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Create payment session for partnership fee ($5)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-partnership-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId: idea.id,
          creatorId: idea.created_by,
          investorId: user.id,
          amount: 500, // $5.00 in cents
          signature: signature,
          investorName: formData.fullName,
          investorEmail: formData.email
        })
      })

      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create payment session')
      }
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else if (data.success) {
        // Payment completed successfully (for demo purposes)
        setPaymentCompleted(true)
        setCurrentStep('message')
        showToast('Payment completed successfully!', 'success')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      showToast(error instanceof Error ? error.message : 'Payment failed. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMessageSubmit = async () => {
    if (!user || !formData.fullName || !formData.email || !formData.message) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      // Save partnership request to database
      const { error } = await supabase
        .from('partnership_requests')
        .insert({
          idea_id: idea.id,
          creator_id: idea.created_by,
          investor_id: user.id,
          investor_name: formData.fullName,
          investor_email: formData.email,
          message: formData.message,
          agreed_nda: true,
          nda_signature: signature,
          payment_amount_cents: 500,
          payment_completed: true,
          status: 'pending'
        })

      if (error) throw error

      // TODO: Send email notification to creator
      // This would typically be handled by a Supabase Edge Function
      
      setCurrentStep('success')
      showToast('Partnership request sent successfully!', 'success')
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 3000)
      }
    } catch (error) {
      console.error('Error submitting partnership request:', error)
      showToast('Failed to send partnership request. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'nda':
        return 'Non-Disclosure Agreement (NDA)'
      case 'payment':
        return 'Partnership Fee Payment'
      case 'message':
        return 'Send Collaboration Request'
      case 'success':
        return 'Request Sent Successfully!'
      default:
        return ''
    }
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 'nda':
        return <FileText className="w-6 h-6 text-blue-400" />
      case 'payment':
        return <DollarSign className="w-6 h-6 text-green-400" />
      case 'message':
        return <Send className="w-6 h-6 text-purple-400" />
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-3">
              {getStepIcon()}
              <div>
                <h2 className="text-2xl font-bold text-white">{getStepTitle()}</h2>
                <p className="text-gray-400">
                  Partnership request for "{idea.title}" by @{idea.author.username}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {['nda', 'payment', 'message', 'success'].map((step, index) => (
                <React.Fragment key={step}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    currentStep === step
                      ? 'bg-blue-500 text-white'
                      : ['nda', 'payment', 'message'].indexOf(currentStep) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-gray-400'
                  }`}>
                    {['nda', 'payment', 'message'].indexOf(currentStep) > index ? '✓' : index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-0.5 transition-all duration-300 ${
                      ['nda', 'payment', 'message'].indexOf(currentStep) > index
                        ? 'bg-green-500'
                        : 'bg-gray-600'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 'nda' && (
            <div className="space-y-6">
              <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
                <div className="flex items-center space-x-2 mb-3">
                  <Scroll className="w-5 h-5 text-blue-400" />
                  <h3 className="font-medium text-white">Partnership NDA Agreement</h3>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 max-h-64 overflow-y-auto border border-gray-600/30">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {NDA_TEXT.replace('[IDEA_TITLE_PLACEHOLDER]', idea.title)}
                  </pre>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-medium text-sm">Important Notice</p>
                    <p className="text-blue-300/80 text-sm mt-1">
                      By proceeding, you agree to keep all shared information confidential and use it solely for collaboration evaluation purposes.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Digital Signature *
                </label>
                <div className="relative">
                  <PenTool className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Type your full legal name here"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  By signing below, you agree to the terms of this NDA
                </p>
              </div>

              <button
                onClick={handleNDASubmit}
                disabled={!signature.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-400/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>Continue & Pay Fee</span>
              </button>
            </div>
          )}

          {currentStep === 'payment' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <DollarSign className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Partnership Access Fee</h3>
                <p className="text-gray-400 mb-6">
                  A small fee is required to access the creator's full partnership details and initiate collaboration.
                </p>
              </div>

              <div className="bg-gray-700/30 rounded-xl p-6 border border-gray-600/50">
                <div className="flex justify-between items-center text-sm mb-4">
                  <span className="text-gray-400">Partnership Access Fee:</span>
                  <span className="text-green-400 font-bold text-lg">$5.00</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-4">
                  <span className="text-gray-400">Creator Receives:</span>
                  <span className="text-green-400">$4.50</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Platform Fee:</span>
                  <span className="text-gray-400">$0.50</span>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium text-sm">What You Get</p>
                    <ul className="text-green-300/80 text-sm mt-1 space-y-1">
                      <li>• Direct communication with the creator</li>
                      <li>• Access to detailed partnership information</li>
                      <li>• Priority consideration for collaboration</li>
                      <li>• Creator receives instant notification</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-green-400/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    <span>Pay $5.00 & Continue</span>
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === 'message' && (
            <div className="space-y-6">
              <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
                <h3 className="font-medium text-white mb-2">Partnership Request Details</h3>
                <p className="text-gray-400 text-sm">
                  Your message will be sent directly to @{idea.author.username} along with your contact information.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Partnership Message *
                </label>
                <textarea
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none"
                  placeholder="Describe your background, what you bring to the partnership, your portfolio/experience, and how you envision collaborating on this idea..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button
                onClick={handleMessageSubmit}
                disabled={loading || !formData.fullName || !formData.email || !formData.message}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sending Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Partnership Request</span>
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === 'success' && (
            <div className="text-center space-y-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Request Sent Successfully!</h3>
                <p className="text-gray-400 mb-6">
                  Your partnership request has been sent to @{idea.author.username}. They will receive an email with your details and can respond directly to you.
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-green-400 font-medium">What Happens Next?</p>
                    <ul className="text-green-300/80 text-sm mt-2 space-y-1">
                      <li>• The creator receives your partnership request via email</li>
                      <li>• They can review your message and background</li>
                      <li>• If interested, they'll contact you directly</li>
                      <li>• You can track the status in your investor dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-400/25 transition-all duration-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}