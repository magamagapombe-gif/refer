// POST /api/register
// Body: { name, phone, network, referral_code? }
// 1. Creates pending user in Supabase
export const dynamic = 'force-dynamic'
// 2. Calls LivePay /collect-money for registration fee
// 3. Creates registrations row — confirmed later by poller
import { NextResponse } from 'next/server'
import { adminSupabase }  from '@/lib/supabase-server'
import { collectMoney, makeRef } from '@/lib/livepay'

const FEE = Number(process.env.REGISTRATION_FEE) || 30000

// ── Startup env check (shows in Vercel function logs) ────────
const missingEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LIVEPAY_API_KEY',
  'LIVEPAY_ACCOUNT_NUM',
].filter(k => !process.env[k])
if (missingEnv.length) {
  console.error('[/api/register] MISSING ENV VARS:', missingEnv.join(', '))
}

export async function POST(req) {
  try {
    const { name, phone, network, referral_code } = await req.json()
    console.log('[/api/register] body:', { name, phone, network, referral_code })

    // ── Validate ───────────────────────────────────────────────
    if (!name || !phone || !network) {
      return NextResponse.json({ error: 'name, phone and network are required' }, { status: 400 })
    }
    if (!['MTN', 'AIRTEL'].includes(network)) {
      return NextResponse.json({ error: 'network must be MTN or AIRTEL' }, { status: 400 })
    }

    // ── Check phone not already registered ─────────────────────
    const { data: existing } = await adminSupabase
      .from('users')
      .select('id, is_active')
      .eq('phone', phone.replace(/\D/g, '').replace(/^0/, '256').replace(/^(?!256)/, '256'))
      .maybeSingle()

    if (existing?.is_active) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 })
    }

    // ── Resolve referrer ───────────────────────────────────────
    let referrer_id = null
    if (referral_code) {
      const { data: referrer } = await adminSupabase
        .from('users')
        .select('id')
        .eq('referral_code', referral_code.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle()
      referrer_id = referrer?.id ?? null
    }

    // ── Create user (inactive until payment confirmed) ─────────
    // If a pending user exists for this phone, reuse it (retry flow)
    let user_id = existing?.id

    if (!user_id) {
      const { data: newUser, error: userErr } = await adminSupabase
        .from('users')
        .insert({ name, phone, referred_by: referrer_id, referral_code: '' })
        .select('id')
        .single()
      if (userErr) throw userErr
      user_id = newUser.id
    }

    // ── Collect registration fee via LivePay ───────────────────
    const reference = makeRef('REG')
    const BASE = process.env.LIVEPAY_BASE_URL || 'https://livepay.me/api'
    console.log('[/api/register] LivePay BASE_URL:', BASE)
    console.log('[/api/register] API_KEY set:', !!process.env.LIVEPAY_API_KEY)
    console.log('[/api/register] ACCOUNT_NUM set:', !!process.env.LIVEPAY_ACCOUNT_NUM)

    // Raw connectivity test before calling collectMoney
    try {
      const ping = await fetch(BASE, { method: 'GET' })
      console.log('[/api/register] LivePay ping status:', ping.status)
    } catch (pingErr) {
      console.error('[/api/register] LivePay UNREACHABLE:', pingErr.cause?.code, pingErr.cause?.hostname, pingErr.message)
      return NextResponse.json({ error: `Cannot reach LivePay at ${BASE} — check LIVEPAY_BASE_URL env var` }, { status: 502 })
    }

    const { ok, data: lp } = await collectMoney({
      phone,
      amount: FEE,
      network,
      reference,
      description: 'Refer App — registration fee',
    })

    console.log('[/api/register] LivePay response:', JSON.stringify({ ok, lp }))
    if (!ok || !lp.success) {
      // Don't delete user — let them retry with same phone
      return NextResponse.json(
        { error: lp.message || lp.error || 'Payment initiation failed' },
        { status: 402 }
      )
    }

    // ── Create registrations row (pending) ─────────────────────
    const { error: regErr } = await adminSupabase
      .from('registrations')
      .insert({
        user_id,
        livepay_ref: reference,
        amount: FEE,
        network,
        status: 'pending',
        payload: lp,
      })
    if (regErr) throw regErr

    return NextResponse.json({
      success: true,
      message: `USSD prompt sent to ${phone}. Approve on your phone to complete registration.`,
      reference,
      user_id,
    })

  } catch (err) {
    console.error('[/api/register] CAUGHT ERROR:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
