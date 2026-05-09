// POST /api/register
// Body: { name, phone, network, referral_code? }
// 1. Creates pending user in Supabase
// 2. Calls LivePay /collect-money for registration fee
// 3. Creates registrations row — confirmed later by poller
import { NextResponse } from 'next/server'
import { adminSupabase }  from '@/lib/supabase-server'
import { collectMoney, makeRef } from '@/lib/livepay'

const FEE = Number(process.env.REGISTRATION_FEE) || 30000

export async function POST(req) {
  try {
    const { name, phone, network, referral_code } = await req.json()

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
    const { ok, data: lp } = await collectMoney({
      phone,
      amount: FEE,
      network,
      reference,
      description: 'Refer App — registration fee',
    })

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
    console.error('[/api/register]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
