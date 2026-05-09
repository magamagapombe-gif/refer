import { createClient } from '@supabase/supabase-js'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ── Browser client (uses anon key + user JWT) ─────────────────
export const supabase = createClient(URL, ANON)
