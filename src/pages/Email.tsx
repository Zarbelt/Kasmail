// src/pages/Email.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress } from '../lib/kaspa'
import type { Email, Profile } from '../lib/types'
import { 
  ArrowLeft, 
  Clock, 
  Mail, 
  User, 
  Shield, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  
  Archive,
  Trash2,
 
  ChevronDown,
  ChevronUp,
  Hash,
  Lock,
  AlertTriangle,
  Zap,
  Calendar,
  MessageSquare
} from 'lucide-react'

export default function EmailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [email, setEmail] = useState<Email | null>(null)
  const [senderProfile, setSenderProfile] = useState<Profile | null>(null)
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [
    _copied, setCopied] = useState(false)
  const [expandedHeaders, setExpandedHeaders] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const loadEmail = async () => {
      if (!id) {
        navigate('/inbox')
        return
      }

      try {
        const addr = await getCurrentKaswareAddress()
        if (!addr) {
          navigate('/')
          return
        }
        setCurrentAddress(addr)

        // Fetch email
        const { data: emailData, error: emailError } = await supabase
          .from('emails')
          .select('*')
          .eq('id', id)
          .single()

        if (emailError) throw emailError
        if (!emailData) {
          setError('Email not found')
          setLoading(false)
          return
        }

        // Verify ownership
        if (emailData.from_wallet !== addr && emailData.to_wallet !== addr) {
          setError('Unauthorized access')
          setLoading(false)
          return
        }

        setEmail(emailData as Email)

        // Mark as read if recipient
        if (emailData.to_wallet === addr && !emailData.read) {
          await supabase
            .from('emails')
            .update({ read: true })
            .eq('id', id)
        }

        // Check if external (from real email via ImprovMX)
        const isExternal = emailData.from_wallet.startsWith('external:')

        // Only fetch sender profile if it's an internal KasMail user
        if (!isExternal) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('wallet_address', emailData.from_wallet)
            .single()

          setSenderProfile(profileData as Profile || null)
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load email')
      } finally {
        setLoading(false)
      }
    }

    loadEmail()
  }, [id, navigate])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const handleDelete = async () => {
    if (!email) return
    
    try {
      const { error } = await supabase
        .from('emails')
        .delete()
        .eq('id', email.id)

      if (error) throw error
      navigate('/inbox')
    } catch  {
      setError('Failed to delete email')
    }
  }

  const handleArchive = async () => {
    if (!email) return
    
    try {
      const { error } = await supabase
        .from('emails')
        .update({ archived: true })
        .eq('id', email.id)

      if (error) throw error
      setEmail(prev => prev ? { ...prev, archived: true } : null)
    } catch  {
      setError('Failed to archive email')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Loading Message
          </div>
          <p className="text-gray-500 mt-2">Decrypting KasMail...</p>
        </div>
      </div>
    )
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-950/30 border border-red-800/50 rounded-2xl p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <h2 className="text-2xl font-bold text-white">Error</h2>
          </div>
          <p className="text-red-200 mb-6">{error || 'Email not found'}</p>
          <button
            onClick={() => navigate('/inbox')}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Inbox
          </button>
        </div>
      </div>
    )
  }

  const isExternal = email.from_wallet.startsWith('external:')
  const displayFrom = senderProfile?.username || 
                     (isExternal 
                       ? email.from_wallet.replace('external:', '') 
                       : `${email.from_wallet.slice(0, 12)}...${email.from_wallet.slice(-8)}`)
  
  const displayTo = currentAddress === email.to_wallet 
    ? 'You' 
    : `${email.to_wallet.slice(0, 12)}...${email.to_wallet.slice(-8)}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/inbox')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Inbox</span>
            </button>
          </div>

          {/* Email Card */}
          <div className="bg-gradient-to-br from-gray-900/40 to-black/40 rounded-2xl border border-gray-800/50 backdrop-blur-xl overflow-hidden">
            {/* Header with Subject */}
            <div className="p-6 lg:p-8 border-b border-gray-800/50">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                    {email.subject}
                  </h1>
                  
                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>{formatDate(email.created_at)}</span>
                    </div>
                    <span className="text-gray-600">•</span>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="font-mono text-xs">ID: {email.id.slice(0, 8)}</span>
                    </div>
                    {email.read && (
                      <>
                        <span className="text-gray-600">•</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Read</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions Dropdown */}
                <button 
                  onClick={() => setExpandedHeaders(!expandedHeaders)}
                  className="p-2 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-all"
                >
                  {expandedHeaders ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Sender/Recipient Info */}
              <div className={`space-y-6 ${expandedHeaders ? 'block' : 'hidden'}`}>
                {/* From */}
                <div className="group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <User className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 uppercase tracking-wider">From</p>
                      <p className="text-lg font-semibold text-white truncate">{displayFrom}</p>
                    </div>
                  </div>
                  {!isExternal && (
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => copyToClipboard(email.from_wallet)}
                        className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy address</span>
                      </button>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{email.from_wallet}</span>
                    </div>
                  )}
                </div>

                {/* To */}
                <div className="group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <Mail className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 uppercase tracking-wider">To</p>
                      <p className="text-lg font-semibold text-white truncate">{displayTo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => copyToClipboard(email.to_wallet)}
                      className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy address</span>
                    </button>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-500">{email.to_wallet}</span>
                  </div>
                </div>
              </div>

              {/* Security Badges */}
              <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-gray-800/50">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-300">End-to-End Encrypted</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">Immutable Storage</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">
                    {new Date(email.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="p-6 lg:p-8">
              <div className="prose prose-invert prose-lg max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-gray-200">
                  {email.body}
                </div>
              </div>

              {/* Reply Section */}
              <div className="mt-8 pt-8 border-t border-gray-800/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">Ready to reply?</p>
                      <p className="text-sm text-gray-400">Continue the conversation instantly</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/compose?reply=${email.id}`)}
                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/25"
                  >
                    Reply to Message
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 lg:p-8 border-t border-gray-800/50 bg-gray-900/20">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Sent via Kaspa Network • 1 KAS fee</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleArchive}
                    disabled={email.archived}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Archive className="w-4 h-4" />
                    <span>{email.archived ? 'Archived' : 'Archive'}</span>
                  </button>

                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-4 py-2.5 rounded-xl border border-gray-800 hover:border-gray-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/30 text-red-300 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Confirm Delete</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500/30 hover:bg-red-500/20 text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Related Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/inbox"
              className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800/50 hover:border-gray-700/50 hover:bg-gray-800/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Mail className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-white">Back to Inbox</h3>
              </div>
              <p className="text-sm text-gray-400">Return to your messages</p>
            </Link>

            <button
              onClick={() => navigate('/compose')}
              className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800/50 hover:border-emerald-700/50 hover:bg-emerald-900/10 transition-all group text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Mail className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-white">New Message</h3>
              </div>
              <p className="text-sm text-gray-400">Compose a new KasMail</p>
            </button>

            {!isExternal && (
              <button
                onClick={() => window.open(`https://explorer.kaspa.org/addresses/${email.from_wallet}`, '_blank')}
                className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800/50 hover:border-blue-700/50 hover:bg-blue-900/10 transition-all group text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <ExternalLink className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">View on Explorer</h3>
                </div>
                <p className="text-sm text-gray-400">See transaction details</p>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}