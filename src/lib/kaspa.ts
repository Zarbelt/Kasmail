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
      getUtxoEntries?: () => Promise<any[]>
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
 * Send tiny dust transaction (~0.0001 KAS) for on-chain proof
 * This will trigger wallet popup for user to confirm/sign the send
 * Returns txid or null if failed/cancelled
 */
export async function sendDustTx(): Promise<string | null> {
  if (!window.kasware?.sendKaspa) {
    console.warn('Kasware sendKaspa method is not available in this version – dust tx skipped')
    alert('On-chain proof not supported in current Kasware version. Message will send without proof.')
    return null
  }

  const adminWallet = import.meta.env.VITE_ADMIN_WALLET
  if (!adminWallet) {
    console.error('VITE_ADMIN_WALLET is not set in .env – dust tx skipped')
    alert('Developer wallet not configured. Message will send without on-chain proof.')
    return null
  }

  try {
    console.log(`Attempting to send dust (${Number(DUST_SOMPI)} sompi) to ${adminWallet}...`)

    const txid = await window.kasware.sendKaspa(
      adminWallet,
      Number(DUST_SOMPI), // safe conversion for small number
      { priorityFee: 0 }   // no extra fee needed
    )

    console.log('Dust tx successful! TxID:', txid)
    return txid
  } catch  {
    console.error('Dust transaction failed or user cancelled:')
    // User cancelled or error – proceed without tx
    return null
  }
}