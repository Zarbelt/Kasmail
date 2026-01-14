import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'

export default function Compose() {
  const navigate = useNavigate()
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!to || !body) {
      setError('To address and body are required')
      return
    }

    setSending(true)
    setError(null)

    try {
      const from = await getCurrentKaswareAddress()
      if (!from) throw new Error('No wallet connected')

      const hasMin = await hasMinimumKAS()
      if (!hasMin) throw new Error('Need ≥ 1 KAS to send')

      // Very basic validation — improve with Zod later
      if (!to.startsWith('kaspa:')) {
        throw new Error('Recipient must be a valid Kaspa address (starts with kaspa:)')
      }

      const { error: insertError } = await supabase.from('emails').insert({
        from_wallet: from,
        to_wallet: to,
        subject: subject || '(No subject)',
        body,
      })

      if (insertError) throw insertError

      alert('Email sent successfully!')
      navigate('/dashboard')
    } catch  {
      setError('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          New KasMail
        </h1>

        {error && <div className="bg-red-950 p-5 rounded-xl mb-8 border border-red-800">{error}</div>}

        <div className="space-y-6 bg-gray-900/60 p-8 rounded-2xl border border-gray-800">
          <div>
            <label className="block text-sm text-gray-300 mb-2">To (Kaspa address)</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="kaspa:qzhkxxaully72gk23lyn7z3d9tdzdpw48u..."
              className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
              className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write your message here..."
              className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-bold text-lg transition disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send KasMail'}
          </button>
        </div>
      </div>
    </div>
  )
}