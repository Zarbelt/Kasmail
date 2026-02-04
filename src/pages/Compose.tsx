// src/pages/Compose.tsx
import { useState, useEffect, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS, sendAntiBotFee } from '../lib/kaspa'
import { 
  Send, ArrowLeft, Lock, Paperclip, Info, X, Image as ImageIcon, 
  FileText, Loader2
} from 'lucide-react'

export default function Compose() {
  const navigate = useNavigate()
  const { id: replyToId } = useParams<{ id?: string }>()

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [senderPreview, setSenderPreview] = useState<string>('Loading...')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Attachment
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Anti-bot fee txId
  const [txId, setTxId] = useState<string | null>(null)

  // Load sender preview
  useEffect(() => {
    const loadSenderInfo = async () => {
      const addr = await getCurrentKaswareAddress()
      if (!addr) {
        setSenderPreview('Connect KasWare to send')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('username, anonymous_mode')
        .eq('wallet_address', addr)
        .single()

      if (data?.anonymous_mode || !data?.username) {
        setSenderPreview(`${addr.slice(0, 10)}...${addr.slice(-8)}`)
      } else {
        setSenderPreview(`${data.username}@kasmail.com`)
      }
    }

    loadSenderInfo()
  }, [])

  // Load reply data
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
        setSubject(data.subject?.startsWith('Re: ') ? data.subject : `Re: ${data.subject || '(no subject)'}`)
        setBody(`\n\n────────── Original message ──────────\n${data.body}`)
      }
    }

    loadReplyData()
  }, [replyToId])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File too large (max 5MB)')
      return
    }

    setFile(selected)
    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected)
      setPreviewUrl(url)
    }
  }

  const removeAttachment = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  const handleSend = async () => {
    setSending(true)
    setError(null)

    try {
      const from = await getCurrentKaswareAddress()
      if (!from) throw new Error('Wallet not connected')

      const hasMin = await hasMinimumKAS()
      if (!hasMin) throw new Error('Minimum 1 KAS required')

      // Always send anti-bot fee
      const feeTxId = await sendAntiBotFee()
      if (!feeTxId) {
        throw new Error('Anti-bot fee transaction failed or cancelled. Cannot send email without fee.')
      }
      setTxId(feeTxId)

      let attachmentUrl = null
      if (file) {
        setUploading(true)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(`${from}/${crypto.randomUUID()}/${file.name}`, file)

        if (uploadError) throw uploadError
        attachmentUrl = supabase.storage.from('attachments').getPublicUrl(uploadData.path).data.publicUrl
        setUploading(false)
      }

      const { error: insertError } = await supabase
        .from('emails')
        .insert({
          from_wallet: from,
          to_wallet: to,
          subject,
          body: attachmentUrl ? `${body}\n\nAttachment: ${attachmentUrl}` : body,
          onchain_tx: feeTxId  // Assuming you add this field to your Email type and DB
        })

      if (insertError) throw insertError

      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-950 text-white">
      <main className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Compose KasMail
          </h1>
        </div>

        {/* Form */}
        <div className="space-y-6 bg-gray-900/40 p-8 rounded-2xl border border-gray-800/50 backdrop-blur-xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl flex items-center gap-3">
              <X className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* From */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              From
            </label>
            <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 text-white">
              {senderPreview}
            </div>
          </div>

          {/* To */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">To (Kaspa wallet address)</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="kaspa:qp... or username@kasmail.com"
              className="w-full p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 focus:border-emerald-500/50 outline-none transition-all text-white placeholder:text-gray-500"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              className="w-full p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 focus:border-emerald-500/50 outline-none transition-all text-white placeholder:text-gray-500"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Write your secure message..."
              className="w-full p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 focus:border-emerald-500/50 outline-none transition-all text-white placeholder:text-gray-500 resize-y min-h-[200px]"
            />
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Attachment (optional, max 5MB)
            </label>
            {!file ? (
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-700/50 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-all">
                <input type="file" onChange={handleFileChange} className="hidden" />
                <div className="text-center text-gray-500">
                  <Paperclip className="w-6 h-6 mx-auto mb-2" />
                  <p>Click to upload file</p>
                </div>
              </label>
            ) : (
              <div className="relative">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-48 rounded-xl" />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-gray-800/40 rounded-xl">
                    <FileText className="w-6 h-6 text-emerald-400" />
                    <span>{file.name}</span>
                  </div>
                )}
                <button
                  onClick={removeAttachment}
                  className="absolute top-2 right-2 p-1 bg-red-500/20 rounded-full hover:bg-red-500/40"
                >
                  <X className="w-4 h-4 text-red-300" />
                </button>
              </div>
            )}
          </div>

          {/* Anti-bot Fee Info */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/40 border border-gray-800">
            <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <strong>Anti-bot requirement:</strong> A 2 KAS anti-bot fee will be sent to the developer wallet upon sending this email. This is mandatory to prevent spam and bots. The wallet will prompt for confirmation.
              <span className="block mt-1 text-blue-300">
                Also requires ≥ 1 KAS balance in wallet (never spent, just anti-spam check).
              </span>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSend}
              disabled={sending || uploading || !body.trim() || !to.trim()}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all ${
                sending || uploading || !body.trim() || !to.trim()
                  ? 'bg-gray-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-lg'
              }`}
            >
              {sending || uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploading ? 'Uploading...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send KasMail (with 2 KAS fee)
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}