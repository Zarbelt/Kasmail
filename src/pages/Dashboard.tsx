import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'
import type { Email } from '../lib/types'
import {
  Search, Mail, RefreshCw, Globe, User, Send,
  Inbox, AlertTriangle, PenSquare
} from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState<Email[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')

  const loadData = async (silent = false) => {
    if (!silent) setRefreshing(true)

    const addr = await getCurrentKaswareAddress()
    if (!addr) { navigate('/'); return }
    setCurrentAddress(addr)

    const hasMin = await hasMinimumKAS()
    if (!hasMin) {
      setError('Minimum 1 KAS required to use KasMail')
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
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

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('dashboard-emails')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => loadData(true))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [navigate])

  const { inboxEmails, sentEmails, unreadCount } = useMemo(() => {
    const inbox = emails.filter(e => e.to_wallet === currentAddress)
    const sent  = emails.filter(e => e.from_wallet === currentAddress)
    const unread = inbox.filter(e => !e.read).length
    return { inboxEmails: inbox, sentEmails: sent, unreadCount: unread }
  }, [emails, currentAddress])

  const displayEmails = useMemo(() => {
    const base = activeTab === 'inbox' ? inboxEmails : sentEmails
    if (!searchTerm.trim()) return base
    const term = searchTerm.toLowerCase()
    return base.filter(e =>
      (e.subject ?? '').toLowerCase().includes(term) ||
      (e.body ?? '').toLowerCase().includes(term) ||
      e.from_wallet.toLowerCase().includes(term) ||
      e.to_wallet.toLowerCase().includes(term)
    )
  }, [activeTab, inboxEmails, sentEmails, searchTerm])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Loading KasMail...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl px-5 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">

          {/* Title + unread badge */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                KasMail
              </h1>
              {unreadCount > 0 && (
                <p className="text-xs text-emerald-400">{unreadCount} unread</p>
              )}
            </div>
          </div>

          {/* Search + actions */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-900/60 border border-gray-800/60 rounded-xl text-sm focus:border-emerald-500/50 focus:outline-none transition-all"
              />
            </div>
            <button
              onClick={() => loadData()}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800/60 hover:border-gray-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/compose')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              <PenSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Compose</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 bg-gray-900/50 rounded-xl p-1 border border-gray-800/50 w-fit">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'inbox'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/40'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Inbox
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/40'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Sent
            <span className="text-xs text-gray-500">({sentEmails.length})</span>
          </button>
        </div>
      </header>

      {/* ── Email List ── */}
      <main className="flex-1 overflow-auto p-5 lg:p-8">

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-950/20 border border-red-900/40 mb-5 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {displayEmails.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-5 rounded-2xl bg-gray-900/20 border border-gray-800/40 mb-4">
              {activeTab === 'inbox'
                ? <Inbox className="w-10 h-10 text-gray-700 mx-auto" />
                : <Send className="w-10 h-10 text-gray-700 mx-auto" />
              }
            </div>
            <h3 className="text-lg font-bold text-gray-400 mb-2">
              {searchTerm ? `No results for "${searchTerm}"` : activeTab === 'inbox' ? 'Inbox is empty' : 'No sent messages'}
            </h3>
            {!searchTerm && activeTab === 'inbox' && (
              <button
                onClick={() => navigate('/compose')}
                className="mt-4 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold text-sm transition-all"
              >
                Send First Message
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayEmails.map(email => {
              const isIncoming   = email.to_wallet === currentAddress
              const isUnread     = isIncoming && !email.read
              const isExternalFrom = email.from_wallet.startsWith('external:')
              const isExternalTo   = email.to_wallet.startsWith('external:')
              const isExternal   = isExternalFrom || isExternalTo

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
                      ? 'bg-emerald-950/10 border-emerald-900/25 hover:border-emerald-600/40'
                      : 'bg-gray-900/15 border-gray-800/25 hover:border-gray-700/40'
                  }`}
                >
                  <div className="flex items-start gap-3">

                    {/* Avatar */}
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      isExternal
                        ? 'bg-purple-500/10 border border-purple-500/20'
                        : isUnread
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-gray-800/40 border border-gray-700/40'
                    }`}>
                      {isExternal
                        ? <Globe className="w-4 h-4 text-purple-400" />
                        : isIncoming
                        ? <User className={`w-4 h-4 ${isUnread ? 'text-emerald-400' : 'text-gray-400'}`} />
                        : <Send className="w-4 h-4 text-gray-400" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                            {isIncoming ? senderDisplay : `To: ${recipientDisplay}`}
                          </span>
                          {isUnread && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded-full font-bold">NEW</span>
                          )}
                          {isExternal && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] bg-purple-500/70 text-white rounded-full font-bold">EXT</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(email.created_at).toLocaleString([], {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className={`text-sm font-medium truncate mb-1 ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                        {email.subject || '(No subject)'}
                      </p>

                      <p className="text-gray-500 text-xs line-clamp-1">
                        {(email.body || '').replace(/\n/g, ' ').slice(0, 120)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}