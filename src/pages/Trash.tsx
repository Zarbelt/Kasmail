import { useNavigate } from 'react-router-dom'
import { useEmails } from '../hooks/useEmails'
import type { Email } from '../lib/types'
import { Trash2 } from 'lucide-react'

export default function Trash() {
  const navigate = useNavigate()
  // For now, show all (until i add 'status' column)
  // Later: useEmails('trash')
  const { emails, loading, error, currentAddress } = useEmails('all')
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-300">Loading trash...</p>
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
        <Trash2 className="w-8 h-8 text-red-400" />
        <h1 className="text-3xl font-bold text-red-300">Trash</h1>
      </div>

      {emails.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Trash is empty</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-auto">
          {emails.map((email: Email) => (
            <div
              key={email.id}
              onClick={() => navigate(`/email/${email.id}`)}
              className="p-5 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-red-600 cursor-pointer transition-all opacity-80 hover:opacity-100"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-white">
                  {email.from_wallet === currentAddress ? 'You → ' : ''}
                  {email.to_wallet.slice(0, 12)}...{email.to_wallet.slice(-6)}
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