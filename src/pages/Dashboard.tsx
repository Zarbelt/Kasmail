import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'
import type { Email } from '../lib/types'


export default function Dashboard() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const addr = await getCurrentKaswareAddress()
      if (!addr) {
        navigate('/')
        return
      }
      setAddress(addr)

      const hasMin = await hasMinimumKAS()
      if (!hasMin) {
        setError('You need ≥ 1 KAS to view inbox')
        setLoading(false)
        return
      }

      // Fetch emails where user is sender or receiver
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .or(`from_wallet.eq.${addr},to_wallet.eq.${addr}`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        setError(error.message)
      } else {
        setEmails(data || [])
      }
      setLoading(false)
    }

    init()

    // Optional: realtime subscription
    const channel = supabase
      .channel('emails-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, (_payload) => {
        // Simple refresh on change (improve later)
        init()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-cyan-400 text-xl animate-pulse">Loading KasMail...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 p-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          KasMail Inbox
        </h1>
        <div className="flex gap-4">
          <Link
            to="/compose"
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition"
          >
            Compose
          </Link>
          <div className="text-sm text-gray-400 self-center">
            {address?.slice(0, 8)}...{address?.slice(-6)}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {error && <div className="bg-red-950 p-5 rounded-xl mb-6 border border-red-800">{error}</div>}

        {emails.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            Your inbox is empty. Send your first KasMail!
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <Link
                key={email.id}
                to={`/email/${email.id}`}
                className={`block p-5 rounded-xl border ${
                  email.read ? 'border-gray-800 bg-gray-900/40' : 'border-cyan-800 bg-cyan-950/30'
                } hover:border-cyan-700 transition`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {email.from_wallet === address ? 'You' : email.from_wallet.slice(0, 12) + '...'}
                      {' → '}
                      {email.to_wallet === address ? 'You' : email.to_wallet.slice(0, 12) + '...'}
                    </p>
                    <p className="text-lg mt-1">{email.subject || '(No subject)'}</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(email.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}