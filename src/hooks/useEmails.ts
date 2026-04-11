// src/hooks/useEmails.ts
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentKaswareAddress, hasMinimumKAS } from '../lib/kaspa'
import type { Email } from '../lib/types'

type FilterType = 'inbox' | 'sent' | 'trash' | 'junk' | 'all'

export function useEmails(filter: FilterType = 'all') {
  const navigate = useNavigate()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)

  const loadEmails = async () => {
    setLoading(true)
    setError(null)

    const addr = await getCurrentKaswareAddress()
    if (!addr) {
      navigate('/')
      return
    }
    setCurrentAddress(addr)

    const hasMin = await hasMinimumKAS()
    if (!hasMin) {
      setError('Minimum 1 KAS required to view messages')
      setLoading(false)
      return
    }

    try {
      let query = supabase
        .from('emails')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter === 'inbox') {
        query = query.eq('to_wallet', addr)
      } else if (filter === 'sent') {
        query = query.eq('from_wallet', addr)
      } else if (filter === 'all') {
        query = query.or(`from_wallet.eq.${addr},to_wallet.eq.${addr}`)
      }
      // trash and junk: show all for now until status column is added

      const { data, error } = await query
      if (error) throw error

      setEmails(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmails()

    const channel = supabase
      .channel(`emails-${filter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => {
        loadEmails()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [filter, navigate])

  return {
    emails,
    loading,
    error,
    currentAddress,
    refresh: loadEmails,
  }
}