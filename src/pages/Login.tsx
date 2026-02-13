// src/pages/Login.tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { connectKaswareWallet, hasMinimumKAS, signChallenge } from '../lib/kaspa'
import { supabase } from '../lib/supabaseClient'
import {
  Mail, Shield, Zap, ArrowRight, ChevronDown,  Globe,
  FileText, BookOpen, ExternalLink, Copy, Check, Wallet, Send,
  Code, Database, EyeOff, Pickaxe, 
} from 'lucide-react'

/* ── Animated number counter ─────────────────────────────────────────────── */
function AnimCount({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          let v = 0
          const step = Math.max(1, Math.ceil(to / 35))
          const t = setInterval(() => {
            v += step
            if (v >= to) { setN(to); clearInterval(t) } else setN(v)
          }, 25)
          obs.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{n}{suffix}</span>
}

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
            <a href="https://github.com/Zarbelt/Kasmail" target="_blank" rel="noopener noreferrer" className="text-[13px] text-gray-500 hover:text-white transition-colors hidden sm:block">GitHub</a>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-1.5 text-[13px] font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 text-black rounded-lg hover:shadow-lg hover:shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-60"
            >
              {loading ? 'Connecting...' : 'Launch App'}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════════════════════════ */}
      <section className="relative pt-28 pb-20 px-5">
        {/* Glow orbs */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-600/[0.06] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-[250px] h-[250px] bg-emerald-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.04] mb-8">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span>
            <span className="text-[11px] font-semibold text-emerald-300/90 tracking-wide">Built for Kaspathon · Powered by Kaspa L1</span>
          </div>

          <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-black leading-[0.92] tracking-[-0.03em] mb-5">
            <span className="text-white">Decentralized Email</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300">That Rewards Miners</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 max-w-lg mx-auto leading-relaxed mb-10">
            Your Kaspa wallet is your identity. Every email sends{' '}
            <span className="text-emerald-400 font-semibold">1 KAS to devs</span> +{' '}
            <span className="text-cyan-400 font-semibold">1 KAS to a random miner</span>.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={handleConnect}
              disabled={loading}
              className="group flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-extrabold rounded-xl text-sm hover:shadow-2xl hover:shadow-cyan-500/25 transition-all hover:scale-[1.03] active:scale-[0.96] disabled:opacity-60"
            >
              <Wallet className="w-4 h-4" />
              Connect KasWare Wallet
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={copyGit}
              className="flex items-center gap-2 px-5 py-3.5 border border-gray-800 hover:border-gray-600 rounded-xl text-[13px] text-gray-400 hover:text-white transition-all bg-white/[0.015]"
            >
              <Code className="w-3.5 h-3.5 text-gray-600" />
              <code className="font-mono text-[11px]">git clone Zarbelt/Kasmail</code>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-700" />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="max-w-sm mx-auto mb-6 px-4 py-2.5 rounded-xl bg-red-950/30 border border-red-800/30 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-10 sm:gap-16 mt-4">
            {[
              { v: 50, s: '', l: 'Miners in Pool' },
              { v: 2, s: ' KAS', l: 'Per Email Fee' },
              { v: 1, s: ' BPS', l: 'Block Speed' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white"><AnimCount to={s.v} suffix={s.s} /></p>
                <p className="text-[10px] text-gray-600 mt-0.5 tracking-wide">{s.l}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-[11px] text-gray-700">
            KasWare extension required · Minimum 1 KAS balance
          </p>
        </div>

        <div className="flex justify-center mt-12">
          <a href="#how" className="animate-bounce text-gray-800 hover:text-gray-500 transition-colors">
            <ChevronDown className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════════════════ */}
      <section id="how" className="py-20 px-5 border-t border-white/[0.03]">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/80 font-bold text-center mb-2">How It Works</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-center mb-14">
            Send an Email, <span className="text-emerald-400">Reward a Miner</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { step: '01', icon: Wallet, t: 'Connect Wallet', d: 'KasWare authenticates you. Your Kaspa address becomes your email identity.', c: 'cyan' },
              { step: '02', icon: Send, t: 'Compose & Send', d: 'Write to @kasmail.org users or external emails via Resend.com relay.', c: 'emerald' },
              { step: '03', icon: Zap, t: 'Two On-Chain Txs', d: '1 KAS → developer wallet (proof) + 1 KAS → random top-50 miner (reward).', c: 'amber' },
              { step: '04', icon: Pickaxe, t: 'Miner Rewarded', d: 'A random miner receives 1 KAS. Both txIds stored for full transparency.', c: 'violet' },
            ].map((item, i) => {
              const colors: Record<string, string> = {
                cyan: 'border-cyan-500/15 bg-cyan-500/[0.04] text-cyan-400',
                emerald: 'border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-400',
                amber: 'border-amber-500/15 bg-amber-500/[0.04] text-amber-400',
                violet: 'border-violet-500/15 bg-violet-500/[0.04] text-violet-400',
              }
              return (
                <div key={i} className="relative p-5 rounded-2xl border border-gray-800/40 bg-[#0a0a0f] hover:border-gray-700/50 transition-all group">
                  <span className="absolute -top-2.5 left-4 text-[9px] font-black text-gray-700 bg-[#0a0a0f] px-2 border border-gray-800/60 rounded-full">{item.step}</span>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 border ${colors[item.c]}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{item.t}</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{item.d}</p>
                </div>
              )
            })}
          </div>

          {/* Fee visual */}
          <div className="max-w-lg mx-auto mt-12 p-5 rounded-2xl bg-[#0a0a0f] border border-gray-800/40">
            <p className="text-[9px] uppercase tracking-[0.3em] text-gray-600 font-bold text-center mb-4">Fee Per Email (Optional)</p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 text-center">
                <p className="text-xl font-black text-emerald-400">1 KAS</p>
                <p className="text-[9px] text-emerald-300/50 mt-0.5">Developer</p>
              </div>
              <span className="text-gray-700 font-bold text-lg">+</span>
              <div className="flex-1 p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/10 text-center">
                <p className="text-xl font-black text-cyan-400">1 KAS</p>
                <p className="text-[9px] text-cyan-300/50 mt-0.5">Random Miner</p>
              </div>
              <span className="text-gray-700 font-bold text-lg">=</span>
              <div className="flex-1 p-3 rounded-xl bg-white/[0.02] border border-gray-800 text-center">
                <p className="text-xl font-black text-white">2 KAS</p>
                <p className="text-[9px] text-gray-600 mt-0.5">Total</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES ══════════════════════════════════ */}
      <section className="py-20 px-5 border-t border-white/[0.03]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Shield, t: 'Wallet = Identity', d: 'No passwords. No central servers. Your Kaspa address is your email address.', c: 'text-cyan-400 bg-cyan-500/[0.06] border-cyan-500/10' },
              { icon: Pickaxe, t: 'Miner Rewards', d: 'Every email distributes 1 KAS to a random miner from the top 50 pool — L1 network effect.', c: 'text-emerald-400 bg-emerald-500/[0.06] border-emerald-500/10' },
              { icon: Globe, t: 'External Email', d: 'Send to Gmail, Outlook via Resend.com. Receive external emails into your KasMail inbox.', c: 'text-blue-400 bg-blue-500/[0.06] border-blue-500/10' },
              { icon: EyeOff, t: 'Anonymous Mode', d: 'Hide your username entirely. Only a truncated wallet address is visible to recipients.', c: 'text-violet-400 bg-violet-500/[0.06] border-violet-500/10' },
              { icon: Database, t: ' Backend', d: 'Real-time inbox, file storage, miner address management — all with Row Level Security.', c: 'text-amber-400 bg-amber-500/[0.06] border-amber-500/10' },
              { icon: Zap, t: 'On-Chain Proof', d: 'Both transaction IDs (dev + miner) stored in the emails table for verifiable delivery.', c: 'text-rose-400 bg-rose-500/[0.06] border-rose-500/10' },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-2xl border border-gray-800/30 bg-[#0a0a0f] hover:border-gray-700/40 transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 border ${f.c}`}>
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="text-[13px] font-bold text-white mb-1">{f.t}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ DOCS / RESEARCH ══════════════════════════ */}
      <section id="docs" className="py-20 px-5 border-t border-white/[0.03]">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/80 font-bold text-center mb-2">Documentation</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-center mb-10">
            Everything You Need
          </h2>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveDoc('readme')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                activeDoc === 'readme'
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                  : 'text-gray-500 border border-gray-800/50 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> README.md
            </button>
            <button
              onClick={() => setActiveDoc('research')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                activeDoc === 'research'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'text-gray-500 border border-gray-800/50 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Research Paper
            </button>
          </div>

          {/* ── README tab ───────────────────────────────────────────── */}
          {activeDoc === 'readme' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="p-5 rounded-2xl border border-gray-800/40 bg-[#0a0a0f]">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
                    <Mail className="w-5 h-5 text-black" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">KasMail — Decentralized Email powered by Kaspa</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Send & receive messages tied to your Kaspa wallet address. No central servers. Every email supports the mining network.
                    </p>
                    <div className="flex items-center gap-3 mt-2.5">
                      <a href="https://github.com/Zarbelt/Kasmail" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                        <ExternalLink className="w-3 h-3" /> GitHub
                      </a>
                      <span className="text-gray-800 text-[10px]">·</span>
                      <span className="text-[11px] text-gray-600">MIT License</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kaspa integration callout */}
              <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02]">
                <h4 className="text-xs font-bold text-emerald-400 mb-2.5">🎯 Kaspa Integration — 3 Layers</h4>
                <div className="space-y-1.5">
                  {[
                    ['1. Identity', 'Kaspa address = your email (KasWare)'],
                    ['2. Delivery Proof', '1 KAS → dev wallet → dev_fee_txid'],
                    ['3. Miner Reward', '1 KAS → random top-50 miner → miner_fee_txid'],
                  ].map(([title, desc], j) => (
                    <div key={j} className="flex items-start gap-2 px-1">
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">{j + 1}</span>
                      <div>
                        <span className="text-[11px] font-bold text-white">{title}</span>
                        <span className="text-[11px] text-gray-500"> — {desc}</span>
                      </div>
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