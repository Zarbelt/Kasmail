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
  AtSign
} from 'lucide-react'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_DOMAIN = '@kasmail.modmedianetwork.com'

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

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', addr)
        .single()

      if (error && error.code !== 'PGRST116') {
        setError(error.message)
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

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', usernameInput)
        .neq('wallet_address', profile?.wallet_address || '')
        .maybeSingle()

      if (error) {
        setUsernameError('Error checking availability')
        setIsAvailable(null)
      } else if (data) {
        setIsAvailable(false)
        setUsernameError(`Username "${usernameInput}" is already taken`)
        
        // Generate suggestions
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

    const { error } = await supabase
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

    if (error) {
      setUsernameError(error.message)
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
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          <p className="text-cyan-300 text-lg">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-950 to-black p-4">
        <div className="max-w-md w-full bg-red-950/30 border border-red-800/50 rounded-2xl p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
          </div>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate('/inbox')}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-gray-400 mt-1">Manage your KasMail account preferences</p>
              </div>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-pulse-once">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <p className="text-emerald-300 font-medium">Settings saved successfully!</p>
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Username Card */}
              <div className="bg-gradient-to-br from-gray-900/40 to-black/40 rounded-2xl border border-gray-800/50 backdrop-blur-xl p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <User className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">KasMail Email Address</h2>
                    <p className="text-sm text-gray-400">Choose your unique email identifier</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Username Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                        placeholder="username"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      />
                      {checking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                        </div>
                      )}
                      {!checking && usernameInput && USERNAME_REGEX.test(usernameInput) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isAvailable ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {usernameError && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {usernameError}
                      </p>
                    )}

                    {!usernameError && usernameInput && (
                      <p className="mt-2 text-sm text-gray-400">
                        3-20 characters • Letters, numbers, underscores
                      </p>
                    )}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Try these available alternatives:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => applySuggestion(suggestion)}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg text-blue-200 text-sm font-medium transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Email Display */}
                  {usernameInput && USERNAME_REGEX.test(usernameInput) && isAvailable && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm text-emerald-300 mb-1 flex items-center gap-2">
                            <AtSign className="w-4 h-4" />
                            Your KasMail Email Address
                          </p>
                          <p className="text-lg font-mono text-white break-all">
                            {getFullEmail(usernameInput)}
                          </p>
                        </div>
                        <button
                          onClick={copyFullEmail}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 transition-all shrink-0"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-300" />
                              <span className="text-sm text-emerald-300">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-emerald-300" />
                              <span className="text-sm text-emerald-300">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current Email (if already set) */}
                  {profile?.username && profile.username !== usernameInput && (
                    <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/50">
                      <p className="text-sm text-gray-400 mb-1">Current Email</p>
                      <p className="text-lg font-mono text-gray-300">
                        {getFullEmail(profile.username)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Settings Card */}
              <div className="bg-gradient-to-br from-gray-900/40 to-black/40 rounded-2xl border border-gray-800/50 backdrop-blur-xl p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Privacy Settings</h2>
                    <p className="text-sm text-gray-400">Control your messaging privacy</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Anonymous Mode Toggle */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-900/30 border border-gray-800/50">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-purple-500/10 mt-1">
                        {anonMode ? (
                          <EyeOff className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">Anonymous Mode</h3>
                        <p className="text-sm text-gray-400">
                          Hide your email address from recipients. They'll see your wallet address instead.
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
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
                          ? 'bg-purple-500/20 border border-purple-500/30'
                          : 'bg-gray-700/30 border border-gray-600/30'
                      }`}
                    >
                      {anonMode ? (
                        <ToggleRight className="w-8 h-8 text-purple-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Only Internal Toggle */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-900/30 border border-gray-800/50">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-blue-500/10 mt-1">
                        <Lock className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">Only KasMail Users</h3>
                        <p className="text-sm text-gray-400">
                          Only accept messages from registered KasMail users with email addresses.
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
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
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-gray-700/30 border border-gray-600/30'
                      }`}
                    >
                      {onlyInternal ? (
                        <ToggleRight className="w-8 h-8 text-blue-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Display Preview */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <h4 className="text-sm font-medium text-cyan-300 mb-2">How Others See You</h4>
                    <p className="text-lg font-mono text-white break-all">
                      {anonMode
                        ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-8)}`
                        : profile?.username 
                        ? getFullEmail(profile.username)
                        : 'No email address set'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      This is how others will see you in messages
                    </p>
                  </div>
                </div>
              </div>

              {/* Wallet Info */}
              <div className="bg-gradient-to-br from-gray-900/40 to-black/40 rounded-2xl border border-gray-800/50 backdrop-blur-xl p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Wallet Information</h2>
                    <p className="text-sm text-gray-400">Your Kaspa wallet details</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Connected Address</p>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900/30 border border-gray-800/50">
                      <p className="font-mono text-cyan-300 truncate">
                        {walletAddress}
                      </p>
                      <button
                        onClick={() => copyToClipboard(walletAddress)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 transition-all"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-sm text-emerald-300 mb-1">Minimum Balance</p>
                      <p className="text-2xl font-bold text-white">1 KAS</p>
                      <p className="text-xs text-emerald-300/70 mt-1">Required to send messages</p>
                    </div>
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <p className="text-sm text-cyan-300 mb-1">Network Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-2xl font-bold text-white">Active</p>
                      </div>
                      <p className="text-xs text-cyan-300/70 mt-1">1 BPS • ~10s confirmations</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || (!!usernameInput && !isAvailable)}
                className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-600 text-white rounded-xl font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Save All Settings
                  </>
                )}
              </button>
            </div>

            {/* Right Column - Info Cards */}
            <div className="space-y-6">
              {/* Security Card */}
              <div className="bg-gradient-to-br from-gray-900/40 to-black/40 rounded-2xl border border-gray-800/50 backdrop-blur-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <ShieldCheck className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Security Features</h3>
                    <p className="text-sm text-gray-400">Powered by Kaspa</p>
                  </div>
                </div>

                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">End-to-End Encryption</p>
                      <p className="text-sm text-gray-400">All messages are encrypted</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Immutable Storage</p>
                      <p className="text-sm text-gray-400">Messages stored on-chain</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">No Central Servers</p>
                      <p className="text-sm text-gray-400">Decentralized architecture</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-gray-900/40 to-black/40 rounded-2xl border border-gray-800/50 backdrop-blur-xl p-6">
                <h3 className="font-bold text-white mb-6">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/inbox')}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-900/30 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10">
                        <Mail className="w-4 h-4 text-cyan-400" />
                      </div>
                      <span className="font-medium">Back to Inbox</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  </button>
                  <button
                    onClick={() => navigate('/compose')}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-400/40 hover:bg-emerald-500/15 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <Mail className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="font-medium">Compose Message</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
                  </button>
                  <button
                    onClick={() => window.open('https://kaspa.org', '_blank')}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-500/15 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Globe className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="font-medium">Kaspa Explorer</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                  </button>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-gradient-to-br from-gray-900/40 to-black/40 rounded-2xl border border-gray-800/50 backdrop-blur-xl p-6">
                <h3 className="font-bold text-white mb-6">Current Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Email Address</span>
                    <span className="font-medium text-emerald-300">
                      {profile?.username ? 'Set' : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Only KasMail Users</span>
                    <span className={`font-medium ${onlyInternal ? 'text-blue-300' : 'text-emerald-300'}`}>
                      {onlyInternal ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Privacy Mode</span>
                    <span className={`font-medium ${anonMode ? 'text-cyan-300' : 'text-emerald-300'}`}>
                      {anonMode ? 'Anonymous' : 'Public'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Messages Sent</span>
                    <span className="font-medium text-white">--</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Messages Received</span>
                    <span className="font-medium text-white">--</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse-once {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-once {
          animation: pulse-once 2s ease-in-out;
        }
      `}</style>
    </div>
  )
}