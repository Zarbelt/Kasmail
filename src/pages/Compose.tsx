// src/pages/Compose.tsx
import { useState, useEffect, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS, sendDustTx } from '../lib/kaspa'
import { 
  Send, ArrowLeft, Lock, Paperclip, Info, X, Image as ImageIcon, 
  FileText, Loader2, ToggleLeft, ToggleRight 
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

  // On-chain proof toggle
  const [onchainProof, setOnchainProof] = useState(false)
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

    if (selected.size > 20 * 1024 * 1024) {
      setError('File too large (max 20MB)')
      return
    }

    setFile(selected)
    setError(null)

    if (selected.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setPreviewUrl(reader.result as string)
      reader.readAsDataURL(selected)
    } else {
      setPreviewUrl(null)
    }
  }

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null
    setUploading(true)

    const ext = file.name.split('.').pop()
    const name = `${Date.now()}.${ext}`
    const path = name

    const { error } = await supabase.storage
      .from('attachments')
      .upload(path, file)

    if (error) {
      setError('Upload failed: ' + error.message)
      setUploading(false)
      return null
    }

    const { data } = supabase.storage.from('attachments').getPublicUrl(path)
    setUploading(false)
    return data.publicUrl
  }

  const handleSend = async () => {
    if (!to.trim() || !body.trim()) {
      setError('Recipient and message body required')
      return
    }

    if (!to.startsWith('kaspa:')) {
      setError('Invalid Kaspa address (must start with kaspa:)')
      return
    }

    setSending(true)
    setError(null)
    setTxId(null)

    try {
      const from = await getCurrentKaswareAddress()
      if (!from) throw new Error('No wallet connected')

      const hasMin = await hasMinimumKAS()
      if (!hasMin) throw new Error('Need ≥ 1 KAS in wallet (security check only – not spent)')

      let uploadedUrl: string | null = null
      if (file) {
        uploadedUrl = await uploadFile()
        if (!uploadedUrl) throw new Error('Attachment upload failed')
      }

      let txIdResult: string | null = null
      if (onchainProof) {
        txIdResult = await sendDustTx()
      }

      const { error: insertError } = await supabase
        .from('emails')
        .insert({
          from_wallet: from,
          to_wallet: to,
          subject: subject.trim() || '(No subject)',
          body: body.trim(),
          reply_to: replyToId || null,
          attachment_url: uploadedUrl,
          attachment_name: file?.name || null,
          attachment_type: file?.type || null,
          kaspa_txid: txIdResult,
        })

      if (insertError) throw insertError

      // Success message with tx link if available
      if (txIdResult) {
        const explorerLink = `https://explorer.kaspa.org/txs/${txIdResult}`
        alert(`KasMail sent with on-chain proof!\n\nTransaction: ${txIdResult}\n\nView on Kaspa Explorer:\n${explorerLink}`)
      } else {
        alert('KasMail sent successfully! (no on-chain proof attached)')
      }

      navigate('/inbox')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      setError(message)
    } finally {
      setSending(false)
    }
  }

  const removeAttachment = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-black via-gray-950 to-black text-white">
      <header className="sticky top-0 z-10 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/inbox')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/50 hover:bg-gray-800/70 border border-gray-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Encrypted</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200">
              {error}
            </div>
          )}

          {/* Sender Preview */}
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase text-gray-400">From</span>
            </div>
            <p className="font-medium text-emerald-300">{senderPreview}</p>
          </div>

          {/* To */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="kaspa:q..."
              className="w-full p-4 bg-gray-900/50 border border-gray-800 rounded-xl focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="(optional)"
              className="w-full p-4 bg-gray-900/50 border border-gray-800 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Your message here..."
              className="w-full p-4 bg-gray-900/50 border border-gray-800 rounded-xl focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Attachment (optional)</label>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-emerald-500 transition-all">
                <Paperclip className="w-5 h-5 text-gray-400" />
                <span>Choose file</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.txt,.doc,.docx"
                />
              </label>

              {file && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900/70 border border-gray-700">
                  {file.type.startsWith('image/') && previewUrl ? (
                    <img src={previewUrl} alt="preview" className="w-10 h-10 object-cover rounded" />
                  ) : file.type.includes('pdf') ? (
                    <FileText className="w-10 h-10 text-red-400" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-medium block truncate max-w-[180px]">{file.name}</span>
                    <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button onClick={() => setFile(null)} className="p-1 hover:bg-red-900/30 rounded">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* On-chain Proof Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900/40 border border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Send className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-white">Record on-chain (optional)</p>
                <p className="text-sm text-gray-400">
                  Send ~0.0001 KAS (~$0.001) to developer as proof
                </p>
              </div>
            </div>

            <button
              onClick={() => setOnchainProof(!onchainProof)}
              className="text-3xl transition-colors"
            >
              {onchainProof ? (
                <ToggleRight className="text-blue-500" />
              ) : (
                <ToggleLeft className="text-gray-500" />
              )}
            </button>
          </div>

          {/* Security Hint */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/40 border border-gray-800">
            <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <strong>Security requirement:</strong> ≥ 1 KAS balance in wallet (never spent, just anti-spam check).
              {onchainProof && (
                <span className="block mt-1 text-blue-300">
                  Optional: Tiny dust tx (~0.0001 KAS) will be sent to developer wallet for on-chain record.
                </span>
              )}
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
                  Send KasMail
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}