// src/pages/Settings.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'
import type { Profile } from '../lib/types'
import Sidebar from '../components/Sidebar'
import { 
  ArrowLeft, 
  
  CheckCircle, 
   
  User, 
  Shield, 
  Eye, 
  EyeOff,
  Lock,
  Zap,
  Settings as SettingsIcon,
  Mail,
  AlertCircle,
  RefreshCw,
  Globe,
  ShieldCheck,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

export default function Settings() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [anonMode, setAnonMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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

      if (error && error.code !== 'PGRST116') { // not found is ok
        setError(error.message)
      } else if (data) {
        setProfile(data as Profile)
        setUsernameInput(data.username || '')
        setAnonMode(data.anonymous_mode || false)
      }

      setLoading(false)
    }

    loadProfile()
  }, [navigate])

  // Real-time username availability check
  useEffect(() => {
    if (!usernameInput || !USERNAME_REGEX.test(usernameInput)) {
      setIsAvailable(null)
      setUsernameError(null)
      return
    }

    const checkAvailability = async () => {
      setChecking(true)
      setUsernameError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', usernameInput)
        .neq('wallet_address', profile?.wallet_address || '') // exclude self
        .maybeSingle()

      if (error) {
        setUsernameError('Error checking availability')
      } else {
        setIsAvailable(!data)
        if (data) {
          setUsernameError('Username already taken')
        }
      }
      setChecking(false)
    }

    const timer = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timer)
  }, [usernameInput, profile?.wallet_address])

  const handleSaveUsername = async () => {
    if (!profile) return
    if (!usernameInput) {
      setUsernameError('Username is required')
      return
    }
    if (!USERNAME_REGEX.test(usernameInput)) {
      setUsernameError('Only letters, numbers, underscore. 3–20 characters.')
      return
    }
    if (!isAvailable) {
      setUsernameError('Username is not available')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        wallet_address: profile.wallet_address,
        username: usernameInput,
        anonymous_mode: anonMode,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address'
      })

    if (error) {
      setUsernameError(error.message)
    } else {
      setProfile(prev => prev ? { ...prev, username: usernameInput } : null)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
    setSaving(false)
  }

  const handleToggleAnon = async () => {
    if (!profile) return

    const newMode = !anonMode
    setAnonMode(newMode)

    const { error } = await supabase
      .from('profiles')
      .update({ anonymous_mode: newMode })
      .eq('wallet_address', profile.wallet_address)

    if (error) {
      alert('Failed to update anonymous mode')
      setAnonMode(!newMode) // rollback
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Loading Settings
          </div>
          <p className="text-gray-500 mt-2">Fetching your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-gray-950 to-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl"></div>
      </div>

      <Sidebar unreadCount={0} onLogout={() => navigate('/')} />

      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800/50 bg-gray-900/20 backdrop-blur-xl p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 transition-all group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="font-medium">Back to Inbox</span>
                </button>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20">
                    <SettingsIcon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                      Settings
                    </h1>
                    <p className="text-sm text-gray-400">Manage your KasMail identity</p>
                  </div>
                </div>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse-once">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium text-emerald-300">Settings saved!</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            {error ? (
              <div className="mb-6 p-5 rounded-2xl bg-red-950/30 border border-red-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <p className="text-red-200 font-medium">{error}</p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Main Settings */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-gray-900/40 to-black/40 rounded-2xl border border-gray-800/50 backdrop-blur-xl overflow-hidden">
                  <div className="p-6 lg:p-8 border-b border-gray-800/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <User className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Your KasMail Identity</h2>
                        <p className="text-sm text-gray-400">Set up your public username</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Choose Your Username
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={usernameInput}
                              onChange={e => setUsernameInput(e.target.value.trim())}
                              placeholder="yourname"
                              className={`w-full p-4 bg-gray-900/50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                                checking ? 'border-cyan-500/50' :
                                isAvailable === true ? 'border-emerald-500/50' :
                                isAvailable === false ? 'border-red-500/50' :
                                'border-gray-800 focus:border-emerald-500'
                              }`}
                              disabled={!!profile?.username}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-mono">
                              @kasmail.com
                            </div>
                          </div>
                          <button
                            onClick={handleSaveUsername}
                            disabled={saving || !isAvailable || checking || !!profile?.username}
                            className={`px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-[1.02] disabled:transform-none ${
                              saving || !isAvailable || checking || !!profile?.username
                                ? 'bg-gray-800 cursor-not-allowed opacity-60'
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25'
                            }`}
                          >
                            {saving ? (
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                            ) : profile?.username ? (
                              'Username Set'
                            ) : (
                              'Save Username'
                            )}
                          </button>
                        </div>

                        {/* Status Indicators */}
                        {usernameInput && (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                checking ? 'bg-cyan-500 animate-pulse' :
                                isAvailable === true ? 'bg-emerald-500' :
                                isAvailable === false ? 'bg-red-500' :
                                'bg-gray-600'
                              }`}></div>
                              <span className={`text-sm ${
                                checking ? 'text-cyan-400' :
                                isAvailable === true ? 'text-emerald-400' :
                                isAvailable === false ? 'text-red-400' :
                                'text-gray-400'
                              }`}>
                                {checking ? 'Checking availability...' :
                                 isAvailable === true ? '✓ Available' :
                                 isAvailable === false ? '✗ Username taken' :
                                 'Enter a username'}
                              </span>
                            </div>

                            {isAvailable === true && (
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-emerald-300 font-medium">
                                  Your KasMail address will be:
                                </p>
                                <p className="text-lg font-bold text-white mt-1">
                                  {usernameInput}@kasmail.com
                                </p>
                              </div>
                            )}

                            {profile?.username && (
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-emerald-300 font-medium">
                                  Your current KasMail address:
                                </p>
                                <p className="text-lg font-bold text-white mt-1">
                                  {profile.username}@kasmail.com
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {usernameError && (
                          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-400" />
                              <span className="text-red-300 text-sm">{usernameError}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Requirements */}
                      <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/50">
                        <p className="text-sm text-gray-400 mb-3">Username Requirements:</p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              usernameInput.length >= 3 && usernameInput.length <= 20 
                                ? 'bg-emerald-500' 
                                : 'bg-gray-700'
                            }`}></div>
                            <span className={usernameInput.length >= 3 && usernameInput.length <= 20 ? 'text-white' : 'text-gray-500'}>
                              3-20 characters
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              USERNAME_REGEX.test(usernameInput) 
                                ? 'bg-emerald-500' 
                                : 'bg-gray-700'
                            }`}></div>
                            <span className={USERNAME_REGEX.test(usernameInput) ? 'text-white' : 'text-gray-500'}>
                              Letters, numbers, and underscores only
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              isAvailable === true 
                                ? 'bg-emerald-500' 
                                : 'bg-gray-700'
                            }`}></div>
                            <span className={isAvailable === true ? 'text-white' : 'text-gray-500'}>
                              Unique username
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="p-6 lg:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <Shield className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Privacy Settings</h2>
                        <p className="text-sm text-gray-400">Control your visibility</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900/30 border border-gray-800/50">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-emerald-500/10">
                            {anonMode ? <EyeOff className="w-5 h-5 text-emerald-400" /> : <Eye className="w-5 h-5 text-emerald-400" />}
                          </div>
                          <div>
                            <p className="font-semibold text-white">Anonymous Mode</p>
                            <p className="text-sm text-gray-400">
                              {anonMode 
                                ? 'Your wallet address will be shown instead of username' 
                                : 'Your username will be shown publicly'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={anonMode}
                            onChange={handleToggleAnon}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-7"></div>
                        </label>
                      </div>

                      <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/50">
                        <p className="text-sm text-gray-400 mb-2">Current Display:</p>
                        <p className="text-lg font-bold text-emerald-300">
                          {anonMode 
                            ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-8)}`
                            : `${profile?.username || usernameInput || 'username'}@kasmail.com`
                          }
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          This is how others will see you in messages
                        </p>
                      </div>
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
                      onClick={() => navigate('/dashboard')}
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
                      <span className="text-gray-400">Username</span>
                      <span className="font-medium text-emerald-300">
                        {profile?.username ? 'Set' : 'Not set'}
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
      </div>

      <style >{`
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