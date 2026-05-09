'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { s, card, btn, input, alert } from '@/lib/styles'

export default function WithdrawPage() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [form, setForm]       = useState({ amount: '', phone: '', network: '' })
  const [status, setStatus]   = useState('')   // '' | 'loading' | 'success' | 'error'
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.status === 401 ? router.push('/auth/login') : r.json())
      .then(d => d.wallet_balance && setBalance(d.wallet_balance))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const ugx = (n)   => `UGX ${Number(n).toLocaleString()}`
  const fee  = Math.round(Number(form.amount) * 0.05)
  const net  = Number(form.amount) - fee

  async function submit(e) {
    e.preventDefault()
    if (!form.network) { setMsg('Select a network'); return }
    setStatus('loading'); setMsg('')

    const res  = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    const json = await res.json()

    if (json.success) {
      setStatus('success')
      setMsg(`${ugx(json.net_amount)} sent to ${form.phone}`)
    } else {
      setStatus('error')
      setMsg(json.error || 'Withdrawal failed')
    }
  }

  if (status === 'success') return (
    <Shell router={router}>
      <div style={{ ...s.center, padding: '40px 16px' }}>
        <div style={s.checkIcon}>✓</div>
        <h2 style={s.h2}>Withdrawal sent!</h2>
        <p style={s.muted}>{msg}</p>
        <button style={{ ...btn.primary, marginTop: 24 }} onClick={() => router.push('/dashboard')}>Back to dashboard</button>
      </div>
    </Shell>
  )

  return (
    <Shell router={router}>
      <div style={card.raised}>
        {/* Balance banner */}
        <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#6c47ff' }}>Available balance</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#6c47ff' }}>{ugx(balance)}</div>
        </div>

        <h2 style={{ ...s.h2, marginTop: 0 }}>Withdraw funds</h2>

        <form onSubmit={submit}>
          <label style={s.label}>Amount (UGX)</label>
          <input style={input.base} type="number" min="10000" max={balance}
            value={form.amount} onChange={e => set('amount', e.target.value)}
            placeholder="Min UGX 10,000" required />

          {/* Fee breakdown */}
          {form.amount >= 10000 && (
            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '12px 14px', marginTop: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}>
                <span>Platform fee (5%)</span><span>- {ugx(fee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#111' }}>
                <span>You receive</span><span style={{ color: '#16a34a' }}>{ugx(net > 0 ? net : 0)}</span>
              </div>
            </div>
          )}

          <label style={s.label}>Send to phone</label>
          <input style={input.base} type="tel" value={form.phone}
            onChange={e => set('phone', e.target.value)} placeholder="e.g. 0779710365" required />

          <label style={s.label}>Network</label>
          <div style={s.netGrid}>
            {[['MTN', '#f5b800'], ['AIRTEL', '#e03a2f']].map(([net, color]) => (
              <button type="button" key={net} onClick={() => set('network', net)}
                style={{ ...s.netBtn, borderColor: form.network === net ? color : '#e5e7eb', background: form.network === net ? color + '18' : '#fafafa' }}>
                <div style={{ ...s.netDot, background: color, width: 24, height: 24 }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{net}</span>
              </button>
            ))}
          </div>

          {msg && <div style={status === 'error' ? alert.error : alert.info}>{msg}</div>}

          <button type="submit" style={{ ...btn.primary, marginTop: 20 }}
            disabled={status === 'loading' || !form.amount || !form.phone || !form.network}>
            {status === 'loading' ? 'Processing…' : `Withdraw ${form.amount ? ugx(form.amount) : ''}`}
          </button>
        </form>
      </div>

      {/* Rules */}
      <div style={{ ...card.flat, fontSize: 13, color: '#888', lineHeight: 1.7 }}>
        <strong style={{ color: '#555' }}>Withdrawal rules</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          <li>Minimum withdrawal: UGX 10,000</li>
          <li>Platform fee: 5% deducted from amount</li>
          <li>Requires at least 1 confirmed referral</li>
          <li>Sent instantly via MTN MoMo or Airtel Money</li>
        </ul>
      </div>
    </Shell>
  )
}

function Shell({ children, router }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '0 0 40px' }}>
      <div style={{ background: '#6c47ff', padding: '16px 20px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer' }}
            onClick={() => router.back()}>← Back</button>
        </div>
      </div>
      <div style={{ maxWidth: 480, margin: '20px auto 0', padding: '0 16px' }}>
        {children}
      </div>
    </div>
  )
}
