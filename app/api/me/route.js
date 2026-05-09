// GET /api/me
// Returns the authenticated user's full dashboard data:
// wallet balance, rank, referral count, recent transactions
import { NextResponse } from 'next/server'
import { adminSupabase }  from '@/lib/supabase'
import { requireUser }    from '@/lib/auth'

export async function GET() {
  let user
  try { ({ user } = await requireUser()) }
  catch (e) { return e }

  try {
    // ── User profile ─────────────────────────────────────────
    const { data: member, error } = await adminSupabase
      .from('users')
      .select('id, name, phone, referral_code, rank, is_active, wallet_balance, total_earned, total_withdrawn, direct_referral_count, created_at')
      .eq('id', user.id)
      .single()
    if (error) throw error

    // ── Last 20 transactions ─────────────────────────────────
    const { data: transactions } = await adminSupabase
      .from('transactions')
      .select('id, type, source, amount, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // ── Direct referrals list ─────────────────────────────────
    const { data: referrals } = await adminSupabase
      .from('users')
      .select('id, name, rank, is_active, created_at')
      .eq('referred_by', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // ── Referral link ─────────────────────────────────────────
    const base_url = process.env.NEXT_PUBLIC_APP_URL || 'https://refer.vercel.app'
    const referral_link = `${base_url}/join?ref=${member.referral_code}`

    return NextResponse.json({
      ...member,
      referral_link,
      transactions: transactions || [],
      referrals:    referrals    || [],
    })

  } catch (err) {
    console.error('[/api/me]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
