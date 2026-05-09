// POST /api/withdraw
// Body: { amount, phone, network }
// Requires: authenticated user (active, with sufficient balance)
import { NextResponse } from 'next/server'
import { adminSupabase }  from '@/lib/supabase-server'
import { requireUser }    from '@/lib/auth'
import { sendMoney, makeRef } from '@/lib/livepay'

const MIN_WITHDRAWAL = 10000  // UGX 10,000
const PLATFORM_FEE   = 0.05   // 5%

export async function POST(req) {
  // ── Auth ──────────────────────────────────────────────────────
  let user, sb
  try { ({ user, sb } = await requireUser()) }
  catch (e) { return e }

  try {
    const { amount, phone, network } = await req.json()

    // ── Validate input ────────────────────────────────────────
    if (!amount || !phone || !network) {
      return NextResponse.json({ error: 'amount, phone and network are required' }, { status: 400 })
    }
    if (!['MTN', 'AIRTEL'].includes(network)) {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 })
    }
    if (Number(amount) < MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `Minimum withdrawal is UGX ${MIN_WITHDRAWAL.toLocaleString()}` }, { status: 400 })
    }

    // ── Fetch user record ──────────────────────────────────────
    const { data: member, error: mErr } = await adminSupabase
      .from('users')
      .select('id, wallet_balance, is_active, direct_referral_count')
      .eq('id', user.id)
      .single()

    if (mErr || !member) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!member.is_active) return NextResponse.json({ error: 'Account not yet activated' }, { status: 403 })

    // Must have referred at least 1 person to unlock withdrawals
    if (member.direct_referral_count < 1) {
      return NextResponse.json(
        { error: 'Refer at least 1 person to unlock withdrawals' },
        { status: 403 }
      )
    }
    if (member.wallet_balance < Number(amount)) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 })
    }

    // ── Calculate fee and net ──────────────────────────────────
    const fee        = Math.round(Number(amount) * PLATFORM_FEE)
    const net_amount = Number(amount) - fee
    const reference  = makeRef('WDR')

    // ── Debit wallet first (optimistic — rollback if LivePay fails) ──
    const { error: debitErr } = await adminSupabase.rpc('debit_wallet', {
      p_user_id: user.id,
      p_amount:  Number(amount),
    })
    if (debitErr) return NextResponse.json({ error: debitErr.message }, { status: 400 })

    // ── Create withdrawal record ───────────────────────────────
    const { data: wdr, error: wdrErr } = await adminSupabase
      .from('withdrawals')
      .insert({
        user_id:    user.id,
        amount:     Number(amount),
        fee,
        net_amount,
        phone,
        network,
        status:     'processing',
        livepay_ref: reference,
      })
      .select('id')
      .single()
    if (wdrErr) throw wdrErr

    // ── Send via LivePay ───────────────────────────────────────
    const { ok, data: lp } = await sendMoney({
      phone,
      amount: net_amount,
      reference,
      description: 'Refer App withdrawal',
    })

    if (ok && lp.success) {
      // Mark completed
      await adminSupabase
        .from('withdrawals')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', wdr.id)

      // Log debit transaction
      await adminSupabase.from('transactions').insert({
        user_id:     user.id,
        type:        'debit',
        source:      'withdrawal',
        amount:      Number(amount),
        description: `Withdrawal to ${phone} (fee: UGX ${fee.toLocaleString()})`,
        livepay_ref: reference,
        status:      'completed',
      })

      return NextResponse.json({
        success: true,
        message: `UGX ${net_amount.toLocaleString()} sent to ${phone}`,
        fee,
        net_amount,
        reference,
      })
    } else {
      // LivePay failed — refund wallet
      await adminSupabase.rpc('credit_wallet', {
        p_user_id: user.id,
        p_amount:  Number(amount),
      })
      await adminSupabase
        .from('withdrawals')
        .update({ status: 'failed' })
        .eq('id', wdr.id)

      return NextResponse.json(
        { error: lp.message || lp.error || 'Withdrawal failed. Your balance has been restored.' },
        { status: 502 }
      )
    }

  } catch (err) {
    console.error('[/api/withdraw]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
