// src/pages/Compose.tsx
import { useState, useEffect, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS, sendAntiBotFee } from '../lib/kaspa'
import { Send, ArrowLeft, Paperclip, Info, X, Loader2 } from 'lucide-react'
import type { Profile } from '../lib/types'

const EMAIL_DOMAIN = '@kasmail.org'
// Use proxy in development, direct URL in production
const EDGE_SEND_URL = import.meta.env.DEV
  ? '/api/rapid-worker'
  : 'https://gtblmmefwrwshklnonct.supabase.co/functions/v1/rapid-worker'

export default function Compose() {
  const navigate = useNavigate()
  const { id: replyToId } = useParams<{ id?: string }>()

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [senderPreview, setSenderPreview] = useState<string>('Loading...')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  // Attachment
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Load sender preview and profile
  useEffect(() => {
    const loadSenderInfo = async () => {
      const addr = await getCurrentKaswareAddress()
      if (!addr) {
        setSenderPreview('Connect KasWare to send')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', addr)
        .single()

      setProfile(data as Profile)

      if (data?.anonymous_mode || !data?.username) {
        setSenderPreview(`${addr.slice(0, 10)}...${addr.slice(-8)}`)
      } else {
        setSenderPreview(`${data.username}${EMAIL_DOMAIN}`)
      }
    }

    loadSenderInfo()
  }, [])

  // Load reply data if replying
  useEffect(() => {
    if (!replyToId) return

    const loadReplyData = async () => {
      const { data } = await supabase
        .from('emails')
        .select('from_wallet, subject, body')
        .eq('id', replyToId)
        .single()

      if (data) {
        setTo(data.from_wallet)
        setSubject(`Re: ${data.subject || '(no subject)'}`)
        setBody(`\n\nOriginal message:\n${data.body}`)
      }
    }

    loadReplyData()
  }, [replyToId])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)')
      return
    }

    setFile(selected)
    if (selected.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selected))
    }
  }

  const removeAttachment = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  const uploadAttachment = async () => {
    if (!file) return null

    setUploading(true)
    try {
      const { data, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(`${Date.now()}_${file.name}`, file)

      if (uploadError) throw uploadError
      return data.path
    } catch {
      setError('Attachment upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }

  const resolveUsernameToWallet = async (username: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('username', username)
      .single()

    if (!data) {
      throw new Error('Username not found')
    }

    return data.wallet_address
  }

  const handleSend = async () => {
    setSending(true)
    setError(null)

    const addr = await getCurrentKaswareAddress()
    if (!addr || !body.trim() || !to.trim()) {
      setError('Missing fields')
      setSending(false)
      return
    }

    const hasMin = await hasMinimumKAS()
    if (!hasMin) {
      setError('Minimum 1 KAS required')
      setSending(false)
      return
    }

    const isInternal = profile?.only_internal ?? true
    let targetTo = to

    try {
      if (isInternal) {
        // Internal: Only KasMail, with fee
        if (to.includes('@') && !to.endsWith(EMAIL_DOMAIN)) {
          throw new Error('External emails disabled in settings')
        }

        // Resolve if username or @kasmail
        if (to.endsWith(EMAIL_DOMAIN)) {
          targetTo = to.split('@')[0]
        }
        if (!targetTo.startsWith('kaspa:')) {
          targetTo = await resolveUsernameToWallet(targetTo)
        }

        // Send fee for internal
        const feeTxId = await sendAntiBotFee()
        if (!feeTxId) {
          throw new Error('Anti-bot fee cancelled')
        }

        const attachmentPath = await uploadAttachment()

        await supabase.from('emails').insert({
          from_wallet: addr,
          to_wallet: targetTo,
          subject,
          body,
          tx_id: feeTxId,
          attachment: attachmentPath,
        })
      } else {
        // External: send via edge function, no fee
        if (!to.includes('@') || to.endsWith(EMAIL_DOMAIN)) {
          throw new Error('Internal sends disabled - use external emails only')
        }

        const senderEmail = profile?.username
          ? `${profile.username}${EMAIL_DOMAIN}`
          : `anonymous${EMAIL_DOMAIN}`

        const res = await fetch(EDGE_SEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
          },
          body: JSON.stringify({
            from: senderEmail,
            to,
            subject,
            text: body,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Send failed')
        }

        // Store external sent email in DB so it shows in Sent page
        await supabase.from('emails').insert({
          from_wallet: addr,
          to_wallet: `external:${to}`,
          subject,
          body,
          tx_id: null,
          attachment: null,
        })
      }

      navigate('/inbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <button
          onClick={() => navigate('/inbox')}
          className="flex items-center gap-2 mb-8 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inbox
        </button>

        <h1 className="text-2xl font-bold mb-8">Compose KasMail</h1>

        <div className="space-y-5">
          {/* From */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">From</label>
            <div className="p-3 bg-gray-900/30 rounded-xl border border-gray-800/50 text-sm text-gray-300">
              {senderPreview}
            </div>
          </div>

          {/* To */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value.trim())}
              placeholder={
                profile?.only_internal
                  ? 'username or kaspa:address'
                  : 'user@example.com'
              }
              className="w-full p-3 bg-gray-900/30 rounded-xl border border-gray-800/50 focus:border-cyan-500/50 outline-none text-sm transition-colors"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 bg-gray-900/30 rounded-xl border border-gray-800/50 focus:border-cyan-500/50 outline-none text-sm transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full p-3 bg-gray-900/30 rounded-xl border border-gray-800/50 focus:border-cyan-500/50 outline-none resize-none text-sm transition-colors leading-relaxed"
            />
          </div>

          {/* Attachment */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-cyan-500/40 cursor-pointer transition-colors text-sm">
              <Paperclip className="w-3.5 h-3.5" />
              Attach
              <input type="file" onChange={handleFileChange} className="hidden" />
            </label>
            {file && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {file.name}
                <button onClick={removeAttachment}>
                  <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                </button>
              </div>
            )}
          </div>
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="max-w-xs rounded-xl" />
          )}

          {/* Anti-bot Fee Notice - internal only */}
          {profile?.only_internal && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/30 border border-gray-800/40">
              <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-gray-300">Anti-bot requirement:</strong> A 2 KAS
                anti-bot fee will be sent to the developer wallet upon sending. This is
                mandatory to prevent spam and bots.
                <span className="block mt-1 text-blue-300/80">
                  Also requires &ge; 1 KAS balance in wallet (never spent, just anti-spam
                  check).
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Send Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSend}
              disabled={sending || uploading || !body.trim() || !to.trim()}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                sending || uploading || !body.trim() || !to.trim()
                  ? 'bg-gray-700 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {sending || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {profile?.only_internal
                    ? 'Send KasMail (2 KAS fee)'
                    : 'Send Email'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}