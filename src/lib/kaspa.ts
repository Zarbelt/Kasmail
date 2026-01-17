// src/lib/kaspa.ts

// Extend window typings for Kasware (full API from docs)
declare global {
  interface Window {
    kasware?: {
      requestAccounts: () => Promise<string[]>
      getAccounts: () => Promise<string[]>
      getBalance: () => Promise<{
        confirmed: number
        unconfirmed: number
        total: number
      }>
      signMessage?: (msg: string) => Promise<string>
      sendKaspa?: (toAddress: string, sompi: number, options?: { priorityFee?: number }) => Promise<string>
      getVersion?: () => Promise<string>
      getNetwork?: () => Promise<string>
      switchNetwork?: (network: string) => Promise<void>
      disconnect?: (origin: string) => Promise<void>
      getPublicKey?: () => Promise<string>
      getUtxoEntries?: () => Promise<[]>
    }
  }
}

// Constants
const MINIMUM_SOMPI = 100_000_000n // 1 KAS
const DUST_SOMPI = 10_000n // ~0.0001 KAS (~$0.001 at current prices)

/**
 * Connect wallet and request permission
 */
export async function connectKaswareWallet(): Promise<string | null> {
  if (!window.kasware) {
    alert('Kasware Wallet not detected. Please install the extension.')
    return null
  }

  try {
    const accounts = await window.kasware.requestAccounts()
    return accounts?.[0] ?? null
  } catch (err) {
    console.error('Kasware connection rejected:', err)
    return null
  }
}

/**
 * Get currently connected address (no popup)
 */
export async function getCurrentKaswareAddress(): Promise<string | null> {
  if (!window.kasware) return null

  try {
    const accounts = await window.kasware.getAccounts()
    return accounts?.[0] ?? null
  } catch (err) {
    console.error('Kasware getAccounts failed:', err)
    return null
  }
}

/**
 * Get wallet balance in SOMPI (BigInt safe)
 */
export async function getKaspaBalanceSompi(): Promise<bigint> {
  if (!window.kasware) return 0n

  try {
    const balance = await window.kasware.getBalance()
    return BigInt(balance.total ?? 0)
  } catch (err) {
    console.error('Kasware balance fetch failed:', err)
    return 0n
  }
}

/**
 * Check minimum KAS requirement (security balance, not deducted)
 */
export async function hasMinimumKAS(): Promise<boolean> {
  const balance = await getKaspaBalanceSompi()
  return balance >= MINIMUM_SOMPI
}

/**
 * Sign login challenge
 */
export async function signChallenge(challenge: string): Promise<string | null> {
  if (!window.kasware?.signMessage) return null

  try {
    return await window.kasware.signMessage(challenge)
  } catch (err) {
    console.error('Kasware signMessage failed:', err)
    return null
  }
}

/**
 * Send tiny dust transaction for on-chain proof
 * Returns txid or null if failed/cancelled
 */
export async function sendDustTx(): Promise<string | null> {
  if (!window.kasware?.sendKaspa) {
    console.warn('Kasware sendKaspa not available – dust tx skipped')
    return null
  }

  const adminWallet = import.meta.env.VITE_ADMIN_WALLET
  if (!adminWallet) {
    console.error('VITE_ADMIN_WALLET not set in .env')
    return null
  }

  try {
    // Send dust to developer/admin wallet
    const txid = await window.kasware.sendKaspa(
      adminWallet,
      Number(DUST_SOMPI), // convert BigInt → number (safe for small values)
      { priorityFee: 0 } // no extra priority fee needed for dust
    )

    console.log('Dust tx sent:', txid)
    return txid
  } catch (err) {
    console.error('Dust transaction failed:', err)
    return null // user cancelled or error → no tx
  }
}