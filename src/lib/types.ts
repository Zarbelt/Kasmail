export interface Profile {
  id: string
  wallet_address: string
  username: string | null
  anonymous_mode: boolean
  email_suffix: string
  kns_domain: string | null
  created_at: string
  updated_at?: string
  only_internal?: boolean  // true = only KasMail users (internal), false = allow external
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

  // Split-fee on-chain proof fields
  dev_fee_txid?: string | null    // 1 KAS tx to developer wallet
  miner_fee_txid?: string | null  // 1 KAS tx to random miner
  miner_address?: string | null   // which miner received the reward

  // Legacy field (kept for backwards compat, migrate to dev_fee_txid)
  tx_id?: string | null

  // Attachment
  attachment?: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: string | null

  // Kaspa legacy (from original schema)
  kaspa_txid?: string | null
}

export interface MinerAddress {
  id: number
  rank: number
  address: string
  pool_source?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}