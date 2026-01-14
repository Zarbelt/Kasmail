// kaspa.ts

// Extend window typings for Kasware
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
    }
  }
}

// 1 KAS = 100,000,000 sompi
const MINIMUM_SOMPI = 100_000_000n

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
 * Get wallet balance in SOMPI
 * Kasware returns numbers, convert safely to BigInt
 */
export async function getKaspaBalanceSompi(): Promise<bigint> {
  if (!window.kasware) return 0n

  try {
    const balance = await window.kasware.getBalance()

    // total = confirmed + unconfirmed (already calculated by wallet)
    return BigInt(balance.total)
  } catch (err) {
    console.error('Kasware balance fetch failed:', err)
    return 0n
  }
}

/**
 * Check if wallet has minimum required KAS
 */
export async function hasMinimumKAS(): Promise<boolean> {
  const balance = await getKaspaBalanceSompi()
  return balance >= MINIMUM_SOMPI
}

/**
 * Sign login challenge (REAL signing, not mock)
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
