import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'
import type { Email, Profile } from '../lib/types'
import {
  Search, Filter, Mail, Clock, User, ArrowUpDown, RefreshCw,
  Shield, Zap, Inbox, Send, Trash2, Star, Archive, AlertTriangle,
  ToggleLeft, ToggleRight, Globe, Lock
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
  const [_profile, setProfile] = useState<Profile | null>(null)
  const [onlyInternal, setOnlyInternal] = useState(true)

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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', addr)
        .single()

      if (profileData) {
        setProfile(profileData as Profile)
        setOnlyInternal(profileData.only_internal ?? true)
      }

      const { data, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .or(`from_wallet.eq.${addr},to_wallet.eq.${addr}`)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setEmails(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Persist toggle to DB
  const handleToggleMode = async () => {
    const newValue = !onlyInternal
    setOnlyInternal(newValue)

    if (currentAddress) {
      await supabase
        .from('profiles')
        .update({ only_internal: newValue, updated_at: new Date().toISOString() })
        .eq('wallet_address', currentAddress)
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

  const filteredEmails = useMemo(() => {
    let result = emails

    // Filter based on toggle
    if (onlyInternal) {
      result = result.filter(
        (e) =>
          !e.from_wallet.startsWith('external:') &&
          !e.to_wallet.startsWith('external:')
      )
    } else {
      result = result.filter(
        (e) =>
          e.from_wallet.startsWith('external:') ||
          e.to_wallet.startsWith('external:')
      )
    }

    // Tab filtering
    switch (activeTab) {
      case 'inbox':
        result = result.filter((e) => e.to_wallet === currentAddress)
        break
      case 'sent':
        result = result.filter((e) => e.from_wallet === currentAddress)
        break
    }

    if (showUnreadOnly) {
      result = result.filter((e) => !e.read && e.to_wallet === currentAddress)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (e) =>
          (e.subject ?? '').toLowerCase().includes(term) ||
          (e.body ?? '').toLowerCase().includes(term) ||
          e.from_wallet.toLowerCase().includes(term) ||
          e.to_wallet.toLowerCase().includes(term)
      )
    }

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
  }, [emails, searchTerm, showUnreadOnly, currentAddress, sortBy, sortAsc, activeTab, onlyInternal])

  const stats = useMemo(() => {
    const inbox = emails.filter((e) => e.to_wallet === currentAddress)
    const sent = emails.filter((e) => e.from_wallet === currentAddress)

    return {
      total: emails.length,
      unread: inbox.filter((e) => !e.read).length,
      inbox: inbox.length,
      sent: sent.length,
      today: emails.filter((e) => {
        const emailDate = new Date(e.created_at)
        const today = new Date()
        return (
          emailDate.getDate() === today.getDate() &&
          emailDate.getMonth() === today.getMonth() &&
          emailDate.getFullYear() === today.getFullYear()
        )
      }).length,
    }
  }, [emails, currentAddress])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6" />
          <div className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Loading KasMail
          </div>
          <p className="text-gray-500 mt-2 text-sm">Connecting to Kaspa network...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl">
        <div className="px-5 lg:px-8 py-4">
          {/* Top row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20">
                  <Mail className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                    KasMail
                  </h1>
                  <p className="text-xs text-gray-500">Lightning-fast messaging</p>
                </div>
              </div>

              {/* Stats chips */}
              <div className="hidden md:flex items-center gap-5 ml-4 pl-4 border-l border-gray-800/50">
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-400">{stats.total}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-400">{stats.unread}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Unread</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{stats.today}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Today</div>
                </div>
              </div>
            </div>

            {/* Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900/60 border border-gray-800/60 rounded-xl text-sm focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadData()}
                  disabled={refreshing}
                  className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800/60 hover:border-gray-700 transition-all disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => navigate('/compose')}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                >
                  Compose
                </button>
              </div>
            </div>
          </div>

          {/* Tabs, Mode Toggle & Filters row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            {/* Left: Tabs */}
            <div className="flex items-center gap-1 bg-gray-900/50 rounded-xl p-1 border border-gray-800/50">
              {(['inbox', 'sent', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === tab
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/40'
                  }`}
                >
                  {tab === 'inbox' && <Inbox className="w-3.5 h-3.5" />}
                  {tab === 'sent' && <Send className="w-3.5 h-3.5" />}
                  {tab === 'all' && <Mail className="w-3.5 h-3.5" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'inbox' && stats.unread > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded-full font-bold">
                      {stats.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Center: Internal/External toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleMode}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all text-sm font-medium ${
                  onlyInternal
                    ? 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                    : 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                }`}
              >
                {onlyInternal ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>KasMail Only</span>
                    <ToggleRight className="w-5 h-5 text-blue-400" />
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>External</span>
                    <ToggleLeft className="w-5 h-5 text-purple-400" />
                  </>
                )}
              </button>
            </div>

            {/* Right: Sort & Unread filter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'sender')}
                  className="bg-gray-900/60 border border-gray-800/60 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="date">Date</option>
                  <option value="sender">Sender</option>
                </select>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="p-1.5 rounded-lg bg-gray-900/60 border border-gray-800/60 hover:border-gray-700"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900/60 border border-gray-800/60 hover:border-gray-700 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${showUnreadOnly ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                  {showUnreadOnly && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-400">Unread</span>
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-5 lg:p-8">
        <div className="max-w-full">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Network Banner */}
          <div className="mb-5 p-4 rounded-xl bg-gray-900/30 border border-gray-800/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-sm text-white">Kaspa Network Active</p>
                  <p className="text-xs text-gray-500">1 BPS block speed &middot; ~10s confirmations</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Encrypted</span>
                </div>
                <div className="h-3 w-px bg-gray-800" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Immutable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email List */}
          {filteredEmails.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-5 rounded-2xl bg-gray-900/20 border border-gray-800/40 mb-5">
                <Mail className="w-12 h-12 text-gray-700 mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-gray-300 mb-2">
                {searchTerm || showUnreadOnly || activeTab !== 'all'
                  ? 'No matching messages'
                  : 'Your inbox is empty'}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                {searchTerm
                  ? `No messages found for "${searchTerm}"`
                  : !onlyInternal
                  ? 'No external messages yet'
                  : activeTab === 'inbox'
                  ? 'Messages sent to you will appear here'
                  : 'Send your first KasMail to get started'}
              </p>
              {!searchTerm && activeTab === 'inbox' && (
                <button
                  onClick={() => navigate('/compose')}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
                >
                  Compose First Message
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEmails.map((email) => {
                const isIncoming = email.to_wallet === currentAddress
                const isUnread = isIncoming && !email.read
                const isExternalFrom = email.from_wallet.startsWith('external:')
                const isExternalTo = email.to_wallet.startsWith('external:')
                const isExternal = isExternalFrom || isExternalTo

                const senderDisplay = isExternalFrom
                  ? email.from_wallet.replace('external:', '')
                  : `${email.from_wallet.slice(0, 10)}...${email.from_wallet.slice(-6)}`

                const recipientDisplay = isExternalTo
                  ? email.to_wallet.replace('external:', '')
                  : `${email.to_wallet.slice(0, 10)}...${email.to_wallet.slice(-6)}`

                return (
                  <div
                    key={email.id}
                    onClick={() => navigate(`/email/${email.id}`)}
                    className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isUnread
                        ? 'bg-emerald-950/10 border-emerald-900/25 hover:border-emerald-700/40'
                        : 'bg-gray-900/15 border-gray-800/25 hover:border-gray-700/40 hover:bg-gray-800/15'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Avatar */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          isUnread
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-gray-800/40 border border-gray-700/40'
                        }`}
                      >
                        {isExternal ? (
                          <Globe className={`w-4.5 h-4.5 ${isUnread ? 'text-emerald-400' : 'text-purple-400'}`} />
                        ) : isIncoming ? (
                          <User className={`w-4.5 h-4.5 ${isUnread ? 'text-emerald-400' : 'text-gray-400'}`} />
                        ) : (
                          <Send className={`w-4.5 h-4.5 ${isUnread ? 'text-emerald-400' : 'text-gray-400'}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-sm truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                              {isIncoming ? senderDisplay : `To: ${recipientDisplay}`}
                            </span>
                            {isUnread && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded-full font-bold">
                                NEW
                              </span>
                            )}
                            {isExternal && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/80 text-white rounded-full font-bold">
                                EXTERNAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(email.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-800/50 transition-all">
                              <Star className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                        </div>

                        <h3 className={`text-sm font-medium mb-1 truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                          {email.subject || '(No subject)'}
                        </h3>

                        <p className="text-gray-500 text-xs line-clamp-1">
                          {email.body.replace(/\n/g, ' ').slice(0, 120)}
                          {email.body.length > 120 ? '...' : ''}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isIncoming
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15'
                                  : 'bg-gray-800/40 text-gray-500 border border-gray-700/40'
                              }`}
                            >
                              {isIncoming ? 'Received' : 'Sent'}
                            </span>
                            <span className="text-[10px] text-gray-600">
                              {new Date(email.created_at).toLocaleDateString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button className="p-1.5 rounded-lg hover:bg-gray-800/50" title="Archive">
                              <Archive className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-red-500/10" title="Delete">
                              <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
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