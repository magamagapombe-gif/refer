// GET /api/confirm-payment
// Called by Vercel cron every minute (vercel.json).
// Also callable manually: GET /api/confirm-payment?ref=REG123
// Polls LivePay for pending registrations and confirms them.
import { NextResponse } from 'next/server'
import { adminSupabase }  from '@/lib/supabase'

const LIVEPAY_BASE = process.env.LIVEPAY_BASE_URL || 'https://livepay.me/api'
const API_KEY      = process.env.LIVEPAY_API_KEY

// Ask LivePay whether a reference was paid
async function checkLivePayStatus(reference) {
  try {
    const res = await fetch(`${LIVEPAY_BASE}/transaction-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ reference }),
    })
    const data = await res.json()
    // LivePay returns { success: true, status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' }
    return data
  } catch {
    return null
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const singleRef = searchParams.get('ref')  // optional: check one specific ref

  // ── Fetch pending registrations (max 20 per cron run) ────────
  let query = adminSupabase
    .from('registrations')
    .select('id, user_id, livepay_ref, amount, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20)

  if (singleRef) query = query.eq('livepay_ref', singleRef)

  // Ignore registrations older than 24 hours (they've expired)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  query = query.gte('created_at', cutoff)

  const { data: pending, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pending?.length) return NextResponse.json({ processed: 0 })

  const results = []

  for (const reg of pending) {
    const lp = await checkLivePayStatus(reg.livepay_ref)

    if (!lp) {
      results.push({ ref: reg.livepay_ref, result: 'check_failed' })
      continue
    }

    if (lp.status === 'SUCCESSFUL') {
      // ── Call our Postgres function — atomic confirm + commission ──
      const { data, error: fnErr } = await adminSupabase
        .rpc('confirm_registration', {
          p_livepay_ref: reg.livepay_ref,
          p_payload: lp,
        })

      if (fnErr) {
        results.push({ ref: reg.livepay_ref, result: 'db_error', error: fnErr.message })
      } else {
        results.push({ ref: reg.livepay_ref, result: 'confirmed', data })
      }

    } else if (lp.status === 'FAILED') {
      // Mark registration failed — user can retry
      await adminSupabase
        .from('registrations')
        .update({ status: 'failed', payload: lp })
        .eq('id', reg.id)
      results.push({ ref: reg.livepay_ref, result: 'payment_failed' })

    } else {
      // Still PENDING — leave it, cron will pick it up next minute
      results.push({ ref: reg.livepay_ref, result: 'still_pending' })
    }
  }

  console.log('[confirm-payment cron]', results)
  return NextResponse.json({ processed: results.length, results })
}
