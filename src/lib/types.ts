export interface Profile {
  id: string
  wallet_address: string
  username: string | null
  kns_domain: string | null
  created_at: string
}

export interface Email {
  id: string
  from_wallet: string
  to_wallet: string
  subject: string
  body: string
  created_at: string
  read: boolean
}