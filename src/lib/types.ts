// src/lib/types.ts (updated to include onchain_tx for Email)
export interface Profile {
  id: string
  wallet_address: string
  username: string | null
  anonymous_mode: boolean
  email_suffix: string
  kns_domain: string | null
  created_at: string
  updated_at?: string
}

export interface Email {
  id: string
  from_wallet: string
  to_wallet: string
  subject: string
  body: string
  created_at: string
  read: boolean
  content: string
  archived: boolean
  onchain_tx?: string | null  // Added for anti-bot fee txId
}