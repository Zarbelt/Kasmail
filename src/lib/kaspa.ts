// src/lib/kaspa.ts

import { supabase } from './supabaseClient'

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
const MINIMUM_SOMPI = 100_000_000n       // 1 KAS (minimum balance check)
const DEV_FEE_SOMPI = 100_000_000n       // 1 KAS → developer wallet
const MINER_REWARD_SOMPI = 100_000_000n  // 1 KAS → random miner from top 50

// Types
export interface MinerAddress {
  id: number
  rank: number
  address: string
  created_at?: string
}

/**
 * Connect wallet and request permission
 */
export async function connectKaswareWallet(): Promise<string | null> {
  if (!window.kasware) {
    alert('Kasware Wallet not detected. Please install the extension.');
    return null;
  }

  try {
    const accounts = await window.kasware.requestAccounts();
    return accounts?.[0] ?? null;
  } catch (err) {
    console.error('Kasware connection rejected:', err);
    return null;
  }
}

/**
 * Get currently connected address (no popup)
 */
export async function getCurrentKaswareAddress(): Promise<string | null> {
  if (!window.kasware) return null;

  try {
    const accounts = await window.kasware.getAccounts();
    return accounts?.[0] ?? null;
  } catch (err) {
    console.error('Kasware getAccounts failed:', err);
    return null;
  }
}

/**
 * Get wallet balance in SOMPI (BigInt safe)
 */
export async function getKaspaBalanceSompi(): Promise<bigint> {
  if (!window.kasware) return 0n;

  try {
    const balance = await window.kasware.getBalance();
    return BigInt(balance.total ?? 0);
  } catch (err) {
    console.error('Kasware balance fetch failed:', err);
    return 0n;
  }
}

/**
 * Check minimum KAS requirement (security balance, not deducted)
 */
export async function hasMinimumKAS(): Promise<boolean> {
  const balance = await getKaspaBalanceSompi();
  return balance >= MINIMUM_SOMPI;
}

/**
 * Sign login challenge
 */
export async function signChallenge(challenge: string): Promise<string | null> {
  if (!window.kasware?.signMessage) return null;

  try {
    return await window.kasware.signMessage(challenge);
  } catch (err) {
    console.error('Kasware signMessage failed:', err);
    return null;
  }
}

/**
 * Fetch a random miner address from the top 50 miner addresses stored in Supabase.
 * Falls back to null if the table is empty or query fails.
 */
export async function getRandomMinerAddress(): Promise<string | null> {
  try {
    // Fetch all miner addresses from Supabase
    const { data, error } = await supabase
      .from('miner_addresses')
      .select('address')

    if (error) {
      console.error('Failed to fetch miner addresses:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn('No miner addresses found in miner_addresses table');
      return null;
    }

    // Pick a random address from the list
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex].address;
  } catch (err) {
    console.error('Unexpected error fetching miner address:', err);
    return null;
  }
}

/**
 * Send 1 KAS developer fee + 1 KAS miner reward for email sending.
 * Transaction 1: 1 KAS → developer wallet (VITE_ADMIN_WALLET)
 * Transaction 2: 1 KAS → random top-50 miner address (from Supabase)
 *
 * Both trigger wallet popups for user confirmation.
 * Returns { devTxId, minerTxId } or null values if either fails/cancelled.
 */
export async function sendAntiBotFee(): Promise<{
  devTxId: string | null
  minerTxId: string | null
  minerAddress: string | null
}> {
  const result = { devTxId: null as string | null, minerTxId: null as string | null, minerAddress: null as string | null };

  if (!window.kasware?.sendKaspa) {
    console.warn('Kasware sendKaspa method is not available — anti-bot fee skipped');
    alert('Anti-bot fee not supported in current Kasware version. Message will send without fee.');
    return result;
  }

  // ── Transaction 1: 1 KAS → Developer Wallet ──────────────────────────
  const adminWallet = import.meta.env.VITE_ADMIN_WALLET;
  if (!adminWallet) {
    console.error('VITE_ADMIN_WALLET is not set in .env — dev fee skipped');
    alert('Developer wallet not configured. Message will send without developer fee.');
  } else {
    try {
      console.log(`Sending 1 KAS dev fee (${Number(DEV_FEE_SOMPI)} sompi) to ${adminWallet}...`);
      const txid = await window.kasware.sendKaspa(
        adminWallet,
        Number(DEV_FEE_SOMPI),
        { priorityFee: 0 }
      );
      console.log('Dev fee tx successful! TxID:', txid);
      result.devTxId = txid;
    } catch (err) {
      console.error('Dev fee transaction failed or user cancelled:', err);
    }
  }

  // ── Transaction 2: 1 KAS → Random Miner from Top 50 ─────────────────
  try {
    const minerAddress = await getRandomMinerAddress();
    if (!minerAddress) {
      console.warn('No miner address available — miner reward skipped');
    } else {
      console.log(`Sending 1 KAS miner reward (${Number(MINER_REWARD_SOMPI)} sompi) to ${minerAddress}...`);
      const txid = await window.kasware.sendKaspa(
        minerAddress,
        Number(MINER_REWARD_SOMPI),
        { priorityFee: 0 }
      );
      console.log('Miner reward tx successful! TxID:', txid);
      result.minerTxId = txid;
      result.minerAddress = minerAddress;
    }
  } catch (err) {
    console.error('Miner reward transaction failed or user cancelled:', err);
  }

  return result;
}