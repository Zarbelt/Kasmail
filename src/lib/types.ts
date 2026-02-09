export interface Profile {
  id: string
  wallet_address: string
  username: string | null
  anonymous_mode: boolean
  email_suffix: string
  kns_domain: string | null
  created_at: string
  updated_at?: string
  only_internal?: boolean  // New: true = only KasMail users (internal), false = allow external
}

export interface Email {
  id: string
  from_wallet: string
  to_wallet: string
  subject: string
  body: string
  created_at: string
  read: boolean
  content:string
  archived: boolean
  
}