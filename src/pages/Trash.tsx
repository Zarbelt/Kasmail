import { useNavigate } from 'react-router-dom'
import { useEmails } from '../hooks/useEmails'
import type { Email } from '../lib/types'
import { Trash2, Globe, Lock } from 'lucide-react'

export default function Trash() {
  const navigate = useNavigate()
  // For now, show all (until a 'status' column is added)
  // Later: useEmails('trash')
  const { emails, loading, error, currentAddress } = useEmails('all')

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Loading trash...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    )
  }

  // Separate internal and external
  const internalEmails = emails.filter(
    (e: Email) =>
      !e.from_wallet.startsWith('external:') &&
      !e.to_wallet.startsWith('external:')
  )
  const externalEmails = emails.filter(
    (e: Email) =>
      e.from_wallet.startsWith('external:') ||
      e.to_wallet.startsWith('external:')
  )

  const renderEmailCard = (email: Email) => {
    const isExternalFrom = email.from_wallet.startsWith('external:')
    const isExternalTo = email.to_wallet.startsWith('external:')
    const isExternal = isExternalFrom || isExternalTo
    const isMine = email.from_wallet === currentAddress

    const fromDisplay = isExternalFrom
      ? email.from_wallet.replace('external:', '')
      : `${email.from_wallet.slice(0, 12)}...${email.from_wallet.slice(-6)}`

    const toDisplay = isExternalTo
      ? email.to_wallet.replace('external:', '')
      : `${email.to_wallet.slice(0, 12)}...${email.to_wallet.slice(-6)}`

    return (
      <div
        key={email.id}
        onClick={() => navigate(`/email/${email.id}`)}
        className="group p-4 rounded-xl bg-gray-900/20 border border-gray-800/30 hover:border-red-600/40 cursor-pointer transition-all opacity-80 hover:opacity-100"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
              isExternal
                ? 'bg-purple-500/10 border border-purple-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            {isExternal ? (
              <Globe className="w-4 h-4 text-purple-400" />
            ) : (
              <Trash2 className="w-4 h-4 text-red-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-white truncate">
                  {isMine ? `You → ${toDisplay}` : `${fromDisplay} → You`}
                </p>
                {isExternal && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/70 text-white rounded-full font-bold">
                    EXTERNAL
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 whitespace-nowrap ml-3">
                {new Date(email.created_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <p className="text-gray-400 text-xs truncate">
              {email.subject || '(No subject)'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-5 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-red-300">Trash</h1>
          <p className="text-xs text-gray-500">
            {emails.length} message{emails.length !== 1 ? 's' : ''} in trash
          </p>
        </div>
      </div>

      {emails.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Trash2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Trash is empty</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 overflow-auto">
          {/* Internal trash */}
          {internalEmails.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                  KasMail ({internalEmails.length})
                </h2>
              </div>
              <div className="space-y-2">
                {internalEmails.map((email: Email) => renderEmailCard(email))}
              </div>
            </div>
          )}

          {/* External trash */}
          {externalEmails.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                  External ({externalEmails.length})
                </h2>
              </div>
              <div className="space-y-2">
                {externalEmails.map((email: Email) => renderEmailCard(email))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}