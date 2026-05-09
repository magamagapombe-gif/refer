'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { s, btn, input, card, alert } from '@/lib/styles'

export default function JoinPage() {
  const params  = useSearchParams()
  const router  = useRouter()
  const refCode = params.get('ref') || ''

  const [form, setForm]     = useState({ name: '', phone: '', network: '', referral_code: refCode })
  const [step, setStep]     = useState('form')   // form | pending | success | error
  const [msg, setMsg]       = useState('')
  const [ref, setRef]       = useState('')
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.network) { setMsg('Select a network'); return }
    setLoading(true); setMsg('')

    const res  = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setLoading(false)

    if (json.success) {
      setRef(json.reference)
      setStep('pending')
      // Poll confirm-payment every 5s for up to 3 minutes
      const id = setInterval(async () => {
        const r = await fetch(`/api/confirm-payment?ref=${json.reference}`)
        const d = await r.json()
        const confirmed = d.results?.find(x => x.ref === json.reference && x.result === 'confirmed')
        if (confirmed) { clearInterval(id); setStep('success') }
        const failed = d.results?.find(x => x.ref === json.reference && x.result === 'payment_failed')
        if (failed) { clearInterval(id); setStep('error'); setMsg('Payment was not completed. Please try again.') }
      }, 5000)
      setTimeout(() => clearInterval(id), 180000)
    } else {
      setMsg(json.error || 'Something went wrong')
    }
  }

  if (step === 'pending') return (
    <Layout>
      <div style={s.center}>
        <div style={s.spinner} />
        <h2 style={s.h2}>Approve on your phone</h2>
        <p style={s.muted}>A USSD prompt has been sent to <strong>{form.phone}</strong>.<br/>
          Dial the prompt to pay <strong>UGX 30,000</strong> and complete registration.</p>
        <p style={{ ...s.muted, marginTop: 16, fontSize: 12 }}>Ref: {ref}</p>
        <p style={{ ...s.muted, fontSize: 12 }}>Waiting for confirmation…</p>
      </div>
    </Layout>
  )

  if (step === 'success') return (
    <Layout>
      <div style={s.center}>
        <div style={s.checkIcon}>✓</div>
        <h2 style={s.h2}>Welcome to Refer!</h2>
        <p style={s.muted}>Your account is active. Start sharing your referral link to earn.</p>
        <button style={btn.primary} onClick={() => router.push('/dashboard')}>Go to Dashboard →</button>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div style={card.raised}>
        <h1 style={s.h1}>Join Refer</h1>
        <p style={s.muted}>Pay UGX 30,000 once. Earn from every person you refer.</p>

        {/* Commission pills */}
        <div style={s.pills}>
          {[['You refer', '40%', '#6c47ff'], ['Their referrer', '15%', '#0ea5e9'], ['3rd level', '5%', '#10b981']].map(([label, pct, color]) => (
            <div key={label} style={{ ...s.pill, borderColor: color }}>
              <span style={{ color, fontWeight: 600 }}>{pct}</span>
              <span style={s.pillLabel}>{label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={submit} style={{ marginTop: 24 }}>
          <label style={s.label}>Full name</label>
          <input style={input.base} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Daniel Matovu" required />

          <label style={s.label}>Phone number</label>
          <input style={input.base} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 0779710365" type="tel" required />

          <label style={s.label}>Network</label>
          <div style={s.netGrid}>
            {[['MTN', '#f5b800', '077x · 078x'], ['AIRTEL', '#e03a2f', '070x · 075x']].map(([net, color, sub]) => (
              <button type="button" key={net} onClick={() => set('network', net)}
                style={{ ...s.netBtn, borderColor: form.network === net ? color : '#e5e7eb', background: form.network === net ? color + '18' : '#fafafa' }}>
                <div style={{ ...s.netDot, background: color }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{net} {net === 'MTN' ? 'MoMo' : 'Money'}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{sub}</div>
                </div>
              </button>
            ))}
          </div>

          <label style={s.label}>Referral code <span style={s.muted}>(optional)</span></label>
          <input style={input.base} value={form.referral_code} onChange={e => set('referral_code', e.target.value)} placeholder="e.g. CL-MATOVU7" />

          {msg && <div style={alert.error}>{msg}</div>}

          <button type="submit" style={{ ...btn.primary, marginTop: 20 }} disabled={loading}>
            {loading ? 'Initiating payment…' : 'Pay & Join — UGX 30,000'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>{children}</div>
    </div>
  )
}
