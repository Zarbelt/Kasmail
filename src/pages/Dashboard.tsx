import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'
import type { Email, Profile } from '../lib/types'
import { 
  Search, Filter, Mail, Clock, User, ArrowUpDown, RefreshCw, 
  Shield, Zap, Inbox, Send, Trash2, Star, Archive, AlertTriangle 
} from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState<Email[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'sender'>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'all'>('inbox')
  const [profile, setProfile] = useState<Profile | null>(null) // For only_internal toggle

  const loadData = async (showLoading = true) => {
    if (showLoading) setRefreshing(true)
    
    const addr = await getCurrentKaswareAddress()
    if (!addr) {
      navigate('/')
      return
    }
    setCurrentAddress(addr)

    const hasMin = await hasMinimumKAS()
    if (!hasMin) {
      setError('Minimum 1 KAS required to use KasMail')
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      // Load user profile (to check only_internal setting)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('only_internal')
        .eq('wallet_address', addr)
        .single()
      setProfile(profileData as Profile)

      // Load all relevant emails
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .or(`from_wallet.eq.${addr},to_wallet.eq.${addr}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmails(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('emails-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => {
        loadData(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [navigate])

  // ── Filtering & Sorting ────────────────────────────────────────────────
  const filteredEmails = useMemo(() => {
    let result = emails

    // Respect user's only_internal setting: hide external emails if enabled
    const onlyInternal = profile?.only_internal ?? true
    if (onlyInternal) {
      result = result.filter(e => !e.from_wallet.startsWith('external:'))
    }

    // Tab filtering
    switch (activeTab) {
      case 'inbox':
        result = result.filter(e => e.to_wallet === currentAddress)
        break
      case 'sent':
        result = result.filter(e => e.from_wallet === currentAddress)
        break
      // 'all' shows everything (after only_internal filter)
    }

    // Unread only
    if (showUnreadOnly) {
      result = result.filter(e => !e.read && e.to_wallet === currentAddress)
    }

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(e => 
        (e.subject ?? '').toLowerCase().includes(term) ||
        (e.body ?? '').toLowerCase().includes(term) ||
        e.from_wallet.toLowerCase().includes(term) ||
        e.to_wallet.toLowerCase().includes(term)
      )
    }

    // Sorting
    result = [...result].sort((a, b) => {
      let comparison = 0
      if (sortBy === 'date') {
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortBy === 'sender') {
        comparison = a.from_wallet.localeCompare(b.from_wallet)
      }
      return sortAsc ? -comparison : comparison
    })

    return result
  }, [emails, searchTerm, showUnreadOnly, currentAddress, sortBy, sortAsc, activeTab, profile])

  const stats = useMemo(() => {
    const inbox = emails.filter(e => e.to_wallet === currentAddress)
    const sent = emails.filter(e => e.from_wallet === currentAddress)
    
    return {
      total: emails.length,
      unread: inbox.filter(e => !e.read).length,
      inbox: inbox.length,
      sent: sent.length,
      today: emails.filter(e => {
        const emailDate = new Date(e.created_at)
        const today = new Date()
        return emailDate.getDate() === today.getDate() &&
               emailDate.getMonth() === today.getMonth() &&
               emailDate.getFullYear() === today.getFullYear()
      }).length
    }
  }, [emails, currentAddress])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Loading KasMail
          </div>
          <p className="text-gray-500 mt-2">Connecting to Kaspa network...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Top Bar (Header) ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl p-4 lg:p-6">
        <div className="max-w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Logo & Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20">
                  <Mail className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                    KasMail
                  </h1>
                  <p className="text-sm text-gray-400">Lightning-fast messaging</p>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{stats.unread}</div>
                  <div className="text-xs text-gray-400">Unread</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{stats.today}</div>
                  <div className="text-xs text-gray-400">Today</div>
                </div>
              </div>
            </div>

            {/* Right: Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Search messages, addresses, content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-800 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all backdrop-blur-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadData()}
                  disabled={refreshing}
                  className="p-3 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 transition-all disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => navigate('/compose')}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25"
                >
                  Compose
                </button>
              </div>
            </div>
          </div>

          {/* Tabs & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-1 bg-gray-900/50 rounded-xl p-1 border border-gray-800">
              {(['inbox', 'sent', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  {tab === 'inbox' && <Inbox className="inline-block w-4 h-4 mr-2" />}
                  {tab === 'sent' && <Send className="inline-block w-4 h-4 mr-2" />}
                  {tab === 'all' && <Mail className="inline-block w-4 h-4 mr-2" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'inbox' && stats.unread > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                      {stats.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'sender')}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="date">Date</option>
                  <option value="sender">Sender</option>
                </select>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="p-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border ${showUnreadOnly ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                  {showUnreadOnly && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">Unread only</span>
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="max-w-full">
          {error && (
            <div className="p-6 rounded-2xl bg-red-950/30 border border-red-900/50 backdrop-blur-xl mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-200 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Network Status Banner */}
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-gray-900/40 to-black/40 border border-gray-800/50 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Kaspa Network Active</p>
                  <p className="text-sm text-gray-400">1 BPS block speed • ~10s confirmations</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-gray-300">Encrypted</span>
                </div>
                <div className="h-4 w-px bg-gray-800"></div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-300">Immutable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email List / Empty State */}
          {filteredEmails.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block p-6 rounded-2xl bg-gray-900/20 border border-gray-800/50 mb-6">
                <Mail className="w-16 h-16 text-gray-600 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-300 mb-2">
                {searchTerm || showUnreadOnly || activeTab !== 'all' ? 'No matching messages' : 'Your inbox is empty'}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                {searchTerm 
                  ? `No messages found for "${searchTerm}"`
                  : activeTab === 'inbox' 
                  ? 'Messages sent to you will appear here'
                  : 'Send your first KasMail to get started'}
              </p>
              {!searchTerm && activeTab === 'inbox' && (
                <button
                  onClick={() => navigate('/compose')}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/25"
                >
                  Compose First Message
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmails.map((email) => {
                const isIncoming = email.to_wallet === currentAddress
                const isUnread = isIncoming && !email.read
                const isExternal = email.from_wallet.startsWith('external:')

                const senderDisplay = isExternal
                  ? email.from_wallet.replace('external:', '')
                  : email.from_wallet.slice(0, 10) + '...' + email.from_wallet.slice(-8)

                return (
                  <div
                    key={email.id}
                    onClick={() => navigate(`/email/${email.id}`)}
                    className={`group p-5 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.002] active:scale-[0.998] ${
                      isUnread
                        ? 'bg-gradient-to-r from-emerald-950/20 to-emerald-950/5 border-emerald-900/30 hover:border-emerald-700/50'
                        : 'bg-gray-900/20 border-gray-800/30 hover:border-gray-700/50 hover:bg-gray-800/20'
                    } backdrop-blur-sm`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar/Icon */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                        isUnread 
                          ? 'bg-emerald-500/10 border border-emerald-500/20' 
                          : 'bg-gray-800/50 border border-gray-700/50'
                      }`}>
                        {isIncoming ? (
                          <User className={`w-6 h-6 ${isUnread ? 'text-emerald-400' : 'text-gray-400'}`} />
                        ) : (
                          <Send className={`w-6 h-6 ${isUnread ? 'text-emerald-400' : 'text-gray-400'}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`font-semibold truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                              {isIncoming ? senderDisplay : `To: ${email.to_wallet.slice(0, 10)}...${email.to_wallet.slice(-8)}`}
                            </span>
                            {isUnread && (
                              <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full font-medium">
                                UNREAD
                              </span>
                            )}
                            {isExternal && (
                              <span className="px-2 py-0.5 text-xs bg-purple-600/80 text-white rounded-full font-medium">
                                EXTERNAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-500 whitespace-nowrap">
                              {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-gray-800/50 transition-all">
                              <Star className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>

                        <h3 className={`font-medium mb-2 truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                          {email.subject || '(No subject)'}
                        </h3>

                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                          {email.body.replace(/\n/g, ' ').slice(0, 150)}
                          {email.body.length > 150 ? '...' : ''}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full ${
                              isIncoming
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
                            }`}>
                              {isIncoming ? 'Received' : 'Sent'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(email.created_at).toLocaleDateString([], { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button className="p-2 rounded-lg hover:bg-gray-800/50" title="Archive">
                              <Archive className="w-4 h-4 text-gray-400" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}