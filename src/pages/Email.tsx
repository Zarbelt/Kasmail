import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Email } from '../lib/types'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'

export default function Email() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [email, setEmail] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEmail = async () => {
      if (!id) return

      const addr = await getCurrentKaswareAddress()
      if (!addr) {
        navigate('/')
        return
      }

      const hasMin = await hasMinimumKAS()
      if (!hasMin) {
        setError('≥ 1 KAS required to read emails')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
      } else if (data && (data.from_wallet === addr || data.to_wallet === addr)) {
        setEmail(data)
        // Mark as read if not already
        if (!data.read) {
          await supabase.from('emails').update({ read: true }).eq('id', id)
        }
      } else {
        setError('Email not found or access denied')
      }
      setLoading(false)
    }

    fetchEmail()
  }, [id, navigate])

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-400">Loading...</div>
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="text-red-400 text-2xl mb-6">Error</div>
        <p className="text-lg mb-8">{error || 'Email not accessible'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl"
        >
          Back to Inbox
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 p-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
        >
          ← Back to Inbox
        </button>
        <h1 className="text-3xl font-bold">{email.subject || '(No subject)'}</h1>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <div className="bg-gray-900/60 p-8 rounded-2xl border border-gray-800">
          <div className="flex justify-between text-sm text-gray-400 mb-6">
            <div>
              <span className="font-medium text-white">From:</span>{' '}
              {email.from_wallet.slice(0, 12)}...{email.from_wallet.slice(-6)}
            </div>
            <div>
              <span className="font-medium text-white">To:</span>{' '}
              {email.to_wallet.slice(0, 12)}...{email.to_wallet.slice(-6)}
            </div>
            <div>{new Date(email.created_at).toLocaleString()}</div>
          </div>

          <div className="whitespace-pre-wrap text-gray-200 leading-relaxed text-lg">
            {email.body}
          </div>
        </div>
      </main>
    </div>
  )
}