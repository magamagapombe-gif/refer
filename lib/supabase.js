import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY

// ── Browser client (uses anon key + user JWT) ─────────────────
export const supabase = createClient(URL, ANON)

// ── Server component / Route handler client (user session) ────
export function createServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => cookieStore.set({ name, value, ...options }),
      remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
    },
  })
}

// ── Service role client (bypasses RLS — API routes only) ──────
export const adminSupabase = createClient(URL, SVC, {
  auth: { autoRefreshToken: false, persistSession: false }
})
