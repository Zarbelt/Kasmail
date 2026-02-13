// src/pages/Login.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { connectKaswareWallet, hasMinimumKAS, signChallenge } from '../lib/kaspa'
import { supabase } from '../lib/supabaseClient'
import {
  Mail, Shield, Zap, ArrowRight, Globe, Info,
  FileText, BookOpen, ExternalLink, Copy, Check, Wallet, Send,
  Code, Database, EyeOff, Pickaxe, AlertCircle,
} from 'lucide-react'

/* ── README doc sections ─────────────────────────────────────────────────── */
const DOC_SECTIONS = [
  {
    title: 'Features',
    items: [
      ['Wallet-based identity', 'KasWare extension — your Kaspa address is your email'],
      ['Username@kasmail.org', 'Custom email addresses stored in server'],
      ['Real-time inbox', 'Instant updates'],
      ['External email', 'Send/receive Gmail, Outlook e.tc'],
      ['Split on-chain proof', '1 KAS dev fee + 1 KAS miner reward per email'],
      ['Anonymous mode', 'Hide username, show truncated wallet address only'],
      ['KasMail-only mode', 'Restrict inbox to other KasMail users only'],
      ['File attachments', 'Coming soon '],
    ],
  },
  {
    title: 'Quick Setup',
    code: `git clone https://github.com/Zarbelt/Kasmail.git
cd Kasmail && pnpm install

npm run dev`,
  },
  {
    title: 'Tech Stack',
    items: [
      ['Frontend', 'React 18 + TypeScript + Vite + Tailwind CSS'],
      ['Wallet', 'KasWare browser extension (window.kasware API)'],
      ['Backend', 'Supabase — PostgreSQL + Realtime + Storage'],
      ['Email Service', 'Resend.com (send & receive external)'],
      ['Miner Data', 'Every email distributes 1 KAS To a random miner from a top pool- L1 Network Effect.'],
      ['Deployment', 'Vercel (frontend) + robust backend'],
    ],
  },
]

/* ── Research paper sections ─────────────────────────────────────────────── */
const RESEARCH = [
  { n: '1', t: 'Scope', b: 'Deliver small Kaspa payloads across the miner network using KasMail. Each email splits a 2 KAS fee: 1 KAS to the developer wallet + 1 KAS to a random top-50 miner.' },
  { n: '2', t: 'Split-Fee Architecture', b: 'Transaction 1 → 1 KAS to VITE_ADMIN_WALLET (on-chain proof + platform). Transaction 2 → 1 KAS to a randomly selected miner from the backend miner_addresses table.' },
  { n: '3', t: 'Implementation', b: 'KasWare API signs transactions in-browser. backend stores miner addresses with RLS. Both txIds (dev_fee_txid + miner_fee_txid) recorded in the emails table for transparency.' },
  { n: '4', t: 'Development Process', b: 'Index top 50 from kaspa-pool.org → Import CSV to backend → Frontend fetches random miner at send-time → Two wallet popups → Both txIds stored with email.' },
]

const MINERS_SAMPLE = [
  'kaspa:qpuglt749t8g...j2rkeak',
  'kaspa:qyp2uw586lfj...gzgyzfgd',
  'kaspa:qp2e05h5wk7e...xc2scqe',
  'kaspa:qp3c0a0cql85...2tu0j86',
  'kaspa:qpxex33p6x6q...h9jzv05',
]

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeDoc, setActiveDoc] = useState<'readme' | 'research'>('readme')
  const [copied, setCopied] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const address = await connectKaswareWallet()
      if (!address) throw new Error('Wallet connection cancelled or failed')

      const hasMin = await hasMinimumKAS()
      if (!hasMin) throw new Error('Minimum 1 KAS required in wallet to use KasMail')

      const challenge = `kasmail-login-v1-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const signature = await signChallenge(challenge)
      if (!signature) throw new Error('Proof of ownership failed')

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ wallet_address: address }, { onConflict: 'wallet_address' })
      if (upsertError) throw new Error(upsertError.message)

      localStorage.setItem('kasmail_wallet', address)
      navigate('/inbox')
    } catch {
      setError('Connection failed. Make sure KasWare is installed and try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyGit = () => {
    navigator.clipboard.writeText('git clone https://github.com/Zarbelt/Kasmail.git')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-cyan-500/30 overflow-x-hidden">
      {/* ── Grain overlay ──────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.012]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* ── Fixed nav ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-40 backdrop-blur-2xl bg-[#050508]/70 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto h-14 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Mail className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-[15px] tracking-tight">
              Kas<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Mail</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#how" className="text-[13px] text-gray-500 hover:text-white transition-colors hidden md:block">How it works</a>
            <a href="README.md" className="text-[13px] text-gray-500 hover:text-white transition-colors hidden md:block">Docs</a>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="group flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-extrabold rounded-lg text-[13px] hover:shadow-lg hover:shadow-cyan-500/20 transition-all hover:scale-[1.03] disabled:opacity-60"
            >
              <Wallet className="w-3.5 h-3.5" />
              {loading ? 'Connecting...' : 'Launch App'}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ══════════════════════════════════════ */}
      <section className="relative pt-24 pb-20 px-5 overflow-hidden">
        {/* BG gradients */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-6">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide">Decentralized Email for Kaspa</span>
          </div>

          {/* Hero headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-5">
            Send Email,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-500">
              Reward Miners
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Every KasMail message sends 1 KAS to a random top miner — supporting the network while proving authenticity on-chain. 
            Connect your wallet, no accounts needed.
          </p>

          {/* Username Notice Card */}
          <div className="max-w-xl mx-auto mb-8 p-4 rounded-xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h3 className="text-sm font-bold text-blue-300 mb-1.5">
                  Set a Username to Receive Emails
                </h3>
                <p className="text-xs text-blue-100/80 leading-relaxed">
                  After connecting your wallet, set a username in Settings to receive external emails at <span className="font-mono text-blue-200">username@kasmail.org</span>. 
                  Without a username, you can send emails but won't be able to receive messages from external senders.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={handleConnect}
              disabled={loading}
              className="group inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-extrabold rounded-xl text-sm hover:shadow-2xl hover:shadow-cyan-500/25 transition-all hover:scale-[1.03] active:scale-[0.96] disabled:opacity-60"
            >
              <Wallet className="w-4 h-4" />
              {loading ? 'Connecting...' : 'Connect Wallet & Enter'}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="https://github.com/Zarbelt/Kasmail"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white font-semibold text-sm transition-all"
            >
              <Code className="w-4 h-4" />
              View on GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {error && (
            <p className="text-sm text-red-400 mt-3">{error}</p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-500">On-chain proof</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="text-gray-500">Miner rewards</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-gray-500">External email support</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ══════════════════════════════ */}
      <section id="how" className="py-20 px-5 border-t border-white/[0.03] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.01] to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">How KasMail Works</h2>
            <p className="text-sm text-gray-500">Three simple steps to decentralized email</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="group p-6 rounded-2xl border border-gray-800/40 bg-gradient-to-br from-gray-900/40 to-gray-950/40 hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold mb-2">1. Connect Wallet</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Install KasWare extension and connect your Kaspa wallet. Your wallet address becomes your identity — no passwords needed.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group p-6 rounded-2xl border border-gray-800/40 bg-gradient-to-br from-gray-900/40 to-gray-950/40 hover:border-emerald-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Send className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold mb-2">2. Send KasMail</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Compose and send. Each message triggers two 1 KAS transactions: one to the dev wallet for on-chain proof, one to a random miner.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group p-6 rounded-2xl border border-gray-800/40 bg-gradient-to-br from-gray-900/40 to-gray-950/40 hover:border-purple-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Pickaxe className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-base font-bold mb-2">3. Miner Gets Paid</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                A random miner from the top-50 pool receives 1 KAS, creating an L1 network effect that benefits the entire Kaspa ecosystem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES ══════════════════════════════════ */}
      <section className="py-20 px-5 border-t border-white/[0.03]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">Powered by Kaspa</h2>
            <p className="text-sm text-gray-500">Email built on the fastest, most scalable proof-of-work blockchain</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl border border-gray-800/30 bg-gray-900/20 hover:bg-gray-900/30 transition-colors">
              <Shield className="w-5 h-5 text-emerald-400 mb-3" />
              <h3 className="text-sm font-bold mb-1.5">On-chain Proof</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Every email has a transaction ID proving authenticity and timestamp</p>
            </div>

            <div className="p-5 rounded-xl border border-gray-800/30 bg-gray-900/20 hover:bg-gray-900/30 transition-colors">
              <Zap className="w-5 h-5 text-cyan-400 mb-3" />
              <h3 className="text-sm font-bold mb-1.5">Instant Delivery</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Real-time inbox updates powered by Kaspa's 1-second block times</p>
            </div>

            <div className="p-5 rounded-xl border border-gray-800/30 bg-gray-900/20 hover:bg-gray-900/30 transition-colors">
              <EyeOff className="w-5 h-5 text-purple-400 mb-3" />
              <h3 className="text-sm font-bold mb-1.5">Anonymous Option</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Hide your username and show only truncated wallet address</p>
            </div>

            <div className="p-5 rounded-xl border border-gray-800/30 bg-gray-900/20 hover:bg-gray-900/30 transition-colors">
              <Globe className="w-5 h-5 text-blue-400 mb-3" />
              <h3 className="text-sm font-bold mb-1.5">External Emails</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Send and receive from Gmail, Outlook, and other providers</p>
            </div>

            <div className="p-5 rounded-xl border border-gray-800/30 bg-gray-900/20 hover:bg-gray-900/30 transition-colors">
              <Database className="w-5 h-5 text-orange-400 mb-3" />
              <h3 className="text-sm font-bold mb-1.5">Decentralized Storage</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Messages stored on robust backend with wallet-based access control</p>
            </div>

            <div className="p-5 rounded-xl border border-gray-800/30 bg-gray-900/20 hover:bg-gray-900/30 transition-colors">
              <Pickaxe className="w-5 h-5 text-yellow-400 mb-3" />
              <h3 className="text-sm font-bold mb-1.5">Miner Rewards</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Direct L1 network support with every message sent</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SPLIT FEE BREAKDOWN ═══════════════════════ */}
      <section className="py-20 px-5 border-t border-white/[0.03] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.01] to-transparent pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">Split-Fee Model</h2>
            <p className="text-sm text-gray-500">Transparent, on-chain fee distribution</p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-800/40 bg-gradient-to-br from-gray-900/40 to-gray-950/40">
            <div className="space-y-4">
              {/* Dev Fee */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-black text-sm">1</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-emerald-300">Developer Fee</h3>
                    <span className="text-emerald-400 font-black">1 KAS</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sent to platform wallet as on-chain proof of message + platform maintenance
                  </p>
                </div>
              </div>

              {/* Miner Fee */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 font-black text-sm">2</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-cyan-300">Miner Reward</h3>
                    <span className="text-cyan-400 font-black">1 KAS</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Random top-50 miner selected from pool — direct L1 network support
                  </p>
                </div>
              </div>

              {/* Balance Check */}
              <div className="pt-4 border-t border-gray-800/30">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <strong className="text-blue-300">Anti-spam check:</strong> Wallet must hold ≥ 1 KAS balance (never spent, just verified)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              Both transaction IDs stored with email for full transparency
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════ DOCS ══════════════════════════════════════ */}
      <section className="py-20 px-5 border-t border-white/[0.03]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">Documentation</h2>
            <p className="text-sm text-gray-500">Technical details and research</p>
          </div>

          {/* Tab switcher */}
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveDoc('readme')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeDoc === 'readme'
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                  : 'border border-gray-800/30 text-gray-500 hover:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              README
            </button>
            <button
              onClick={() => setActiveDoc('research')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeDoc === 'research'
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                  : 'border border-gray-800/30 text-gray-500 hover:text-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Research
            </button>
          </div>

          {/* ── README tab ────────────────────────────────────────────── */}
          {activeDoc === 'readme' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="p-5 rounded-2xl border border-gray-800/40 bg-[#0a0a0f]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-black" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-black">KasMail</h3>
                      <p className="text-[10px] text-gray-500">Decentralized email for Kaspa</p>
                    </div>
                  </div>
                  <button
                    onClick={copyGit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-800/60 text-xs font-semibold transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Clone
                      </>
                    )}
                  </button>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: Code, label: 'React + TS' },
                    { icon: Database, label: 'Supabase' },
                    { icon: Zap, label: 'Kaspa L1' },
                    { icon: Shield, label: 'KasWare' },
                  ].map(({ icon: Icon, label }, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800/30 border border-gray-700/30"
                    >
                      <Icon className="w-3 h-3 text-gray-500" />
                      <span className="text-[10px] font-semibold text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sections */}
              {DOC_SECTIONS.map((sec, i) => (
                <div key={i} className="p-4 rounded-2xl border border-gray-800/30 bg-[#0a0a0f]">
                  <h4 className="text-[13px] font-bold text-white mb-3">{sec.title}</h4>
                  {sec.items && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {sec.items.map(([label, desc], j) => (
                        <div key={j} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.015] transition-colors">
                          <div className="w-1 h-1 rounded-full bg-cyan-500 mt-[7px] shrink-0" />
                          <div>
                            <p className="text-[11px] font-semibold text-gray-200">{label}</p>
                            <p className="text-[10px] text-gray-500">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {sec.code && (
                    <pre className="p-3 rounded-xl bg-black/60 border border-gray-800/30 overflow-x-auto">
                      <code className="text-[11px] text-gray-400 font-mono leading-relaxed whitespace-pre">{sec.code}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Research tab ──────────────────────────────────────────── */}
          {activeDoc === 'research' && (
            <div className="space-y-4">
              {/* Paper header */}
              <div className="p-5 rounded-2xl border border-gray-800/40 bg-[#0a0a0f]">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-14 bg-red-500/10 border border-red-500/15 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-red-400 text-[10px] font-black">PDF</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white leading-tight">
                      Kaspa Payloads for Supporting Miners' L1 Network Effect
                    </h3>
                    <p className="text-[11px] text-emerald-400 font-bold mt-1">MMEDIANET SF1 — Standard Framework</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Updated: KasMail Split-Fee Model via Backend + KasWare</p>
                  </div>
                </div>
              </div>

              {/* Sections */}
              {RESEARCH.map((r, i) => (
                <div key={i} className="p-4 rounded-2xl border border-gray-800/30 bg-[#0a0a0f]">
                  <div className="flex items-start gap-3">
                    <span className="text-[11px] font-black text-cyan-500 bg-cyan-500/10 w-6 h-6 rounded-md flex items-center justify-center shrink-0">{r.n}</span>
                    <div>
                      <h4 className="text-[13px] font-bold text-white mb-1">{r.t}</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{r.b}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Miner pool sample */}
              <div className="p-4 rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.01]">
                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Pickaxe className="w-3 h-3" /> Miner Address Pool (Sample)
                </h4>
                <div className="rounded-xl bg-black/50 border border-gray-800/30 overflow-hidden">
                  {MINERS_SAMPLE.map((addr, i) => (
                    <div key={i} className={`flex items-center gap-2.5 px-3 py-2 text-[11px] ${i > 0 ? 'border-t border-gray-800/20' : ''}`}>
                      <span className="text-cyan-500 font-bold w-5 text-right">#{i + 1}</span>
                      <code className="text-gray-400 font-mono">{addr}</code>
                    </div>
                  ))}
                  <div className="px-3 py-2 border-t border-gray-800/20 text-center">
                    <span className="text-[10px] text-gray-700">… 45 more in backend <code className="text-gray-600">miner_addresses</code></span>
                  </div>
                </div>
              </div>

              {/* Architecture */}
              <div className="p-4 rounded-2xl border border-gray-800/30 bg-[#0a0a0f]">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-3">Transaction Architecture</h4>
                <div className="rounded-xl border border-gray-800/30 overflow-hidden text-[11px]">
                  <div className="grid grid-cols-4 bg-gray-900/50 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="p-2.5">Tx</div><div className="p-2.5">Recipient</div><div className="p-2.5">Amount</div><div className="p-2.5">Purpose</div>
                  </div>
                  <div className="grid grid-cols-4 border-t border-gray-800/20">
                    <div className="p-2.5 text-emerald-300 font-semibold">Dev Fee</div>
                    <div className="p-2.5 text-gray-400 font-mono text-[9px]">VITE_ADMIN_WALLET</div>
                    <div className="p-2.5 text-white font-bold">1 KAS</div>
                    <div className="p-2.5 text-gray-500">Proof + platform</div>
                  </div>
                  <div className="grid grid-cols-4 border-t border-gray-800/20 bg-white/[0.01]">
                    <div className="p-2.5 text-cyan-300 font-semibold">Miner</div>
                    <div className="p-2.5 text-gray-400 font-mono text-[9px]">Random miner</div>
                    <div className="p-2.5 text-white font-bold">1 KAS</div>
                    <div className="p-2.5 text-gray-500">L1 network support</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ════════════════════════════════ */}
      <section className="py-20 px-5 border-t border-white/[0.03] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">Ready to Start?</h2>
          <p className="text-sm text-gray-500 mb-8">
            Connect your KasWare wallet and join the first decentralized email that rewards Kaspa miners.
          </p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-extrabold rounded-xl text-sm hover:shadow-2xl hover:shadow-cyan-500/25 transition-all hover:scale-[1.03] active:scale-[0.96] disabled:opacity-60"
          >
            <Wallet className="w-4 h-4" />
            {loading ? 'Connecting...' : 'Connect Wallet & Enter'}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════════════════════ */}
      <footer className="py-6 px-5 border-t border-white/[0.03]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Mail className="w-2.5 h-2.5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-gray-500">KasMail</span>
          </div>
          <p className="text-[10px] text-gray-700">Built with ♥ for the Kaspa ecosystem — every email supports a miner</p>
          <div className="flex gap-4">
            <a href="https://github.com/Zarbelt/Kasmail" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-gray-300 transition-colors">GitHub</a>
            <a href="https://kaspa.org" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-gray-300 transition-colors">Kaspa.org</a>
          </div>
        </div>
      </footer>
    </div>
  )
}