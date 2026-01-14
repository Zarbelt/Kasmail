import { useNavigate } from 'react-router-dom'
import { connectKaswareWallet, hasMinimumKAS, signChallenge } from '../lib/kaspa'
import { supabase } from '../lib/supabaseClient'
import { useState } from 'react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)

    try {
      const address = await connectKaswareWallet()
      if (!address) throw new Error('Wallet connection cancelled or failed')

      const hasMin = await hasMinimumKAS()
      if (!hasMin) throw new Error('Minimum 1 KAS required in wallet to use KasMail')

      // Simple ownership proof (placeholder until real signing)
      const challenge = `kasmail-login-v1-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const signature = await signChallenge(challenge)

      if (!signature) throw new Error('Proof of ownership failed')

      // Create/upsert profile (wallet_address as primary key)
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            wallet_address: address,
            // username & kns_domain can be added later via settings
          },
          { onConflict: 'wallet_address' }
        )

      if (upsertError) throw new Error(upsertError.message)

      // Optional: store session locally (for protected routes)
      localStorage.setItem('kasmail_wallet', address)

      navigate('/dashboard')
    } catch  {
      setError('Connection failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="w-full max-w-md p-10 bg-gray-900/70 backdrop-blur-2xl rounded-2xl border border-gray-800 shadow-2xl">
        <h1 className="text-5xl font-extrabold text-center mb-3 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          KasMail
        </h1>
        <p className="text-center text-gray-400 mb-12">Decentralized email • Powered by Kaspa</p>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-200 px-5 py-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full py-5 px-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
              </svg>
              Connecting...
            </span>
          ) : (
            'Connect Kasware Wallet'
          )}
        </button>

        <p className="mt-10 text-center text-sm text-gray-500">
          Kasware extension required • ≥ 1 KAS needed to read emails
        </p>
      </div>
    </div>
  )
}