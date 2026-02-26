'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function loginWithMagicLink(email: string) {
  const supabase = await createClient()
  const headersList = await headers()
  const host = headersList.get('host')
  
  // If we are on Vercel or similar, we want https
  // In development, http
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${protocol}://${host}/auth/callback`,
    },
  })

  return { error: error ? error.message : null }
}
