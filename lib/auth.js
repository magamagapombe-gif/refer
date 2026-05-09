import { createServerSupabase } from './supabase-server'

// Returns the authenticated user or throws a 401 response
export async function requireUser() {
  const sb = createServerSupabase()
  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    })
  }
  return { user, sb }
}
