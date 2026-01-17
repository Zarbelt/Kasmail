import { useNavigate } from 'react-router-dom'
import { useEmails } from '../hooks/useEmails'
import type { Email } from '../lib/types'
import { AlertTriangle } from 'lucide-react'

export default function Junk() {
  const navigate = useNavigate()
  // For now show all (until real junk/spam filter)
  const { emails, loading, error } = useEmails('all')

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-300">Loading junk...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="h-full flex items-center justify-center text-red-400">{error}</div>
  }

  return (
    <div className="h-full flex flex-col p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <AlertTriangle className="w-8 h-8 text-yellow-400" />
        <h1 className="text-3xl font-bold text-yellow-300">Junk</h1>
      </div>

      {emails.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>No junk messages</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-auto">
          {emails.map((email: Email) => (
            <div
              key={email.id}
              onClick={() => navigate(`/email/${email.id}`)}
              className="p-5 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-yellow-600 cursor-pointer transition-all opacity-80 hover:opacity-100"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-white">
                  {email.from_wallet.slice(0, 12)}... → {email.to_wallet.slice(0, 12)}...
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(email.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-gray-300 truncate">{email.subject || '(No subject)'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}