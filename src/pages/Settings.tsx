// src/pages/Settings.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'
import type { Profile } from '../lib/types'
import {
  ArrowLeft,
  ToggleRight,
  ToggleLeft,
  CheckCircle,
  User,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Zap,
  Mail,
  AlertCircle,
  RefreshCw,
  Globe,
  ShieldCheck,
  ChevronRight,
  Copy,
  Check,
  AtSign,
} from 'lucide-react'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_DOMAIN = '@kasmail.org'

export default function Settings() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [anonMode, setAnonMode] = useState(false)
  const [onlyInternal, setOnlyInternal] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const getFullEmail = (username: string) => {
    return `${username}${EMAIL_DOMAIN}`
  }

  const generateSuggestions = async (baseUsername: string) => {
    const suggestionList: string[] = []
    const variations = [
      `${baseUsername}${Math.floor(Math.random() * 99) + 1}`,
      `${baseUsername}_${Math.floor(Math.random() * 999) + 1}`,
      `${baseUsername}${new Date().getFullYear().toString().slice(-2)}`,
      `${baseUsername}_official`,
      `the_${baseUsername}`,
    ]

    for (const suggestion of variations) {
      if (!USERNAME_REGEX.test(suggestion)) continue

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', suggestion)
        .maybeSingle()

      if (!data && suggestionList.length < 3) {
        suggestionList.push(suggestion)
      }

      if (suggestionList.length >= 3) break
    }

    return suggestionList
  }

  useEffect(() => {
    const loadProfile = async () => {
      const addr = await getCurrentKaswareAddress()
      if (!addr) {
        navigate('/')
        return
      }
      setWalletAddress(addr)

      const hasMin = await hasMinimumKAS()
      if (!hasMin) {
        setError('Minimum 1 KAS required to access settings')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', addr)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        setError(fetchError.message)
      } else if (data) {
        setProfile(data as Profile)
        setUsernameInput(data.username || '')
        setAnonMode(data.anonymous_mode || false)
        setOnlyInternal(data.only_internal ?? true)
      }

      setLoading(false)
    }

    loadProfile()
  }, [navigate])

  useEffect(() => {
    if (!usernameInput || !USERNAME_REGEX.test(usernameInput)) {
      setIsAvailable(null)
      setUsernameError(null)
      setSuggestions([])
      return
    }

    const checkAvailability = async () => {
      setChecking(true)
      setUsernameError(null)
      setSuggestions([])

      const { data, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', usernameInput)
        .neq('wallet_address', profile?.wallet_address || '')
        .maybeSingle()

      if (checkError) {
        setUsernameError('Error checking availability')
        setIsAvailable(null)
      } else if (data) {
        setIsAvailable(false)
        setUsernameError(`Username "${usernameInput}" is already taken`)

        const suggestedUsernames = await generateSuggestions(usernameInput)
        setSuggestions(suggestedUsernames)
      } else {
        setIsAvailable(true)
        setUsernameError(null)
      }

      setChecking(false)
    }

    const timer = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timer)
  }, [usernameInput, profile?.wallet_address])

  const handleSave = async () => {
    setSaving(true)
    setUsernameError(null)
    setSaveSuccess(false)

    if (usernameInput && !USERNAME_REGEX.test(usernameInput)) {
      setUsernameError('Username must be 3-20 characters, letters, numbers, underscores only')
      setSaving(false)
      return
    }

    if (usernameInput && !isAvailable) {
      setUsernameError('Username not available')
      setSaving(false)
      return
    }

    if (!walletAddress) {
      setUsernameError('Wallet not connected')
      setSaving(false)
      return
    }

    const { error: saveError } = await supabase
      .from('profiles')
      .upsert(
        {
          wallet_address: walletAddress,
          username: usernameInput || null,
          anonymous_mode: anonMode,
          only_internal: onlyInternal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      )

    if (saveError) {
      setUsernameError(saveError.message)
    } else {
      setProfile((prev) =>
        prev
          ? { ...prev, username: usernameInput, anonymous_mode: anonMode, only_internal: onlyInternal }
          : null
      )
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }

    setSaving(false)
  }

  const copyFullEmail = () => {
    if (usernameInput) {
      navigator.clipboard.writeText(getFullEmail(usernameInput))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const applySuggestion = (suggestion: string) => {
    setUsernameInput(suggestion)
    setSuggestions([])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-950 to-black">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
          <p className="text-cyan-300 text-sm">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-950 to-black p-4">
        <div className="max-w-md w-full bg-red-950/20 border border-red-800/40 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
          </div>
          <p className="text-red-300 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate('/inbox')}
                className="p-2 rounded-lg bg-gray-800/40 hover:bg-gray-700/40 border border-gray-700/50 hover:border-gray-600 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-gray-500 text-xs mt-0.5">Manage your KasMail account</p>
              </div>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-emerald-300 text-sm font-medium">Settings saved!</p>
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Username Card */}
              <div className="bg-gradient-to-br from-gray-900/30 to-black/30 rounded-2xl border border-gray-800/40 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/15">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">KasMail Email Address</h2>
                    <p className="text-xs text-gray-500">Choose your unique email identifier</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Username Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Your Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                        placeholder="username"
                        className="w-full px-4 py-2.5 bg-gray-900/40 border border-gray-700/50 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                      />
                      {checking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                        </div>
                      )}
                      {!checking && usernameInput && USERNAME_REGEX.test(usernameInput) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isAvailable ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {usernameError && (
                      <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        {usernameError}
                      </p>
                    )}

                    {!usernameError && usernameInput && (
                      <p className="mt-1.5 text-[10px] text-gray-500">
                        3-20 characters &middot; Letters, numbers, underscores
                      </p>
                    )}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/15">
                      <p className="text-xs font-medium text-blue-300 mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Try these alternatives:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => applySuggestion(suggestion)}
                            className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 hover:border-blue-500/40 rounded-lg text-blue-200 text-xs font-medium transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Email Display */}
                  {usernameInput && USERNAME_REGEX.test(usernameInput) && isAvailable && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/15">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-emerald-300 mb-0.5 flex items-center gap-1.5">
                            <AtSign className="w-3 h-3" />
                            Your KasMail Email Address
                          </p>
                          <p className="text-sm font-mono text-white break-all">
                            {getFullEmail(usernameInput)}
                          </p>
                        </div>
                        <button
                          onClick={copyFullEmail}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 hover:border-emerald-500/40 transition-all shrink-0"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                              <span className="text-xs text-emerald-300">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-emerald-300" />
                              <span className="text-xs text-emerald-300">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current Email */}
                  {profile?.username && profile.username !== usernameInput && (
                    <div className="p-3 rounded-xl bg-gray-900/20 border border-gray-800/40">
                      <p className="text-[10px] text-gray-500 mb-0.5">Current Email</p>
                      <p className="text-sm font-mono text-gray-300">
                        {getFullEmail(profile.username)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Settings Card */}
              <div className="bg-gradient-to-br from-gray-900/30 to-black/30 rounded-2xl border border-gray-800/40 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/15">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Privacy Settings</h2>
                    <p className="text-xs text-gray-500">Control your messaging privacy</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Anonymous Mode */}
                  <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-gray-900/20 border border-gray-800/40">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 mt-0.5">
                        {anonMode ? (
                          <EyeOff className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm text-white mb-0.5">Anonymous Mode</h3>
                        <p className="text-xs text-gray-500">
                          Hide your email from recipients. They see your wallet address instead.
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {anonMode
                            ? 'Recipients see: kaspa:qr...'
                            : profile?.username
                            ? `Recipients see: ${getFullEmail(profile.username)}`
                            : 'Set a username first'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAnonMode(!anonMode)}
                      className={`p-1 rounded-lg transition-all ${
                        anonMode
                          ? 'bg-purple-500/15 border border-purple-500/25'
                          : 'bg-gray-700/20 border border-gray-600/25'
                      }`}
                    >
                      {anonMode ? (
                        <ToggleRight className="w-7 h-7 text-purple-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Only Internal Toggle */}
                  <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-gray-900/20 border border-gray-800/40">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 mt-0.5">
                        <Lock className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm text-white mb-0.5">Only KasMail Users</h3>
                        <p className="text-xs text-gray-500">
                          Only accept messages from registered KasMail users.
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {onlyInternal
                            ? 'Blocking messages from unknown wallet addresses'
                            : 'Accepting messages from any Kaspa wallet'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setOnlyInternal(!onlyInternal)}
                      className={`p-1 rounded-lg transition-all ${
                        onlyInternal
                          ? 'bg-blue-500/15 border border-blue-500/25'
                          : 'bg-gray-700/20 border border-gray-600/25'
                      }`}
                    >
                      {onlyInternal ? (
                        <ToggleRight className="w-7 h-7 text-blue-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Display Preview */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/15">
                    <h4 className="text-xs font-medium text-cyan-300 mb-1">How Others See You</h4>
                    <p className="text-sm font-mono text-white break-all">
                      {anonMode
                        ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-8)}`
                        : profile?.username
                        ? getFullEmail(profile.username)
                        : 'No email address set'}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      This is how others will see you in messages
                    </p>
                  </div>
                </div>
              </div>

              {/* Wallet Info */}
              <div className="bg-gradient-to-br from-gray-900/30 to-black/30 rounded-2xl border border-gray-800/40 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/15">
                    <Globe className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Wallet Information</h2>
                    <p className="text-xs text-gray-500">Your Kaspa wallet details</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Connected Address</p>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/20 border border-gray-800/40">
                      <p className="font-mono text-cyan-300 text-sm truncate">
                        {walletAddress}
                      </p>
                      <button
                        onClick={() => copyToClipboard(walletAddress)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-700/40 border border-gray-700/50 hover:border-gray-600 transition-all"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                      <p className="text-[10px] text-emerald-300 mb-0.5">Minimum Balance</p>
                      <p className="text-xl font-bold text-white">1 KAS</p>
                      <p className="text-[10px] text-emerald-300/60 mt-0.5">Required to send messages</p>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/15">
                      <p className="text-[10px] text-cyan-300 mb-0.5">Network Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-xl font-bold text-white">Active</p>
                      </div>
                      <p className="text-[10px] text-cyan-300/60 mt-0.5">1 BPS &middot; ~10s confirmations</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || (!!usernameInput && !isAvailable)}
                className="w-full py-3 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-600 text-white rounded-xl font-medium text-sm transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save All Settings
                  </>
                )}
              </button>
            </div>

            {/* Right Column - Info Cards */}
            <div className="space-y-5">
              {/* Security Card */}
              <div className="bg-gradient-to-br from-gray-900/30 to-black/30 rounded-2xl border border-gray-800/40 p-5">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/15">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Security Features</h3>
                    <p className="text-[10px] text-gray-500">Powered by Kaspa</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-xs text-white">End-to-End Encryption</p>
                      <p className="text-[10px] text-gray-500">All messages are encrypted</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-xs text-white">Immutable Storage</p>
                      <p className="text-[10px] text-gray-500">Messages stored on-chain</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-xs text-white">No Central Servers</p>
                      <p className="text-[10px] text-gray-500">Decentralized architecture</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-gray-900/30 to-black/30 rounded-2xl border border-gray-800/40 p-5">
                <h3 className="font-bold text-sm text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/inbox')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-900/20 border border-gray-800/40 hover:border-gray-700 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <span className="font-medium text-xs">Back to Inbox</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white" />
                  </button>
                  <button
                    onClick={() => navigate('/compose')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/15 hover:border-emerald-400/30 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/15">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="font-medium text-xs">Compose Message</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
                  </button>
                  <button
                    onClick={() => window.open('https://kaspa.org', '_blank')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/15 hover:border-blue-400/30 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-500/15">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <span className="font-medium text-xs">Kaspa Explorer</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                  </button>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-gradient-to-br from-gray-900/30 to-black/30 rounded-2xl border border-gray-800/40 p-5">
                <h3 className="font-bold text-sm text-white mb-4">Current Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Email Address</span>
                    <span className="font-medium text-emerald-300">
                      {profile?.username ? 'Set' : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Only KasMail Users</span>
                    <span className={`font-medium ${onlyInternal ? 'text-blue-300' : 'text-emerald-300'}`}>
                      {onlyInternal ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Privacy Mode</span>
                    <span className={`font-medium ${anonMode ? 'text-cyan-300' : 'text-emerald-300'}`}>
                      {anonMode ? 'Anonymous' : 'Public'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Messages Sent</span>
                    <span className="font-medium text-white">--</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Messages Received</span>
                    <span className="font-medium text-white">--</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}