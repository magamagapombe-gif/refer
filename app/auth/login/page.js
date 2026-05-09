'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { s, card, btn, input, alert } from '@/lib/styles'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone]   = useState('')
  const [step, setStep]     = useState('phone')  // phone | otp
  const [otp, setOtp]       = useState('')
  const [msg, setMsg]       = useState('')
  const [loading, setLoading] = useState(false)

  async function sendOtp(e) {
    e.preventDefault()
    setLoading(true); setMsg('')
    // Format phone for Supabase (E.164)
    const formatted = '+' + phone.replace(/\D/g, '').replace(/^0/, '256').replace(/^(?!256)/, '256')
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    setStep('otp')
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setLoading(true); setMsg('')
    const formatted = '+' + phone.replace(/\D/g, '').replace(/^0/, '256').replace(/^(?!256)/, '256')
    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
          <h1 style={s.h1}>Sign in to Refer</h1>
          <p style={s.muted}>Enter your phone number to continue</p>
        </div>
        <div style={card.raised}>
          {step === 'phone' ? (
            <form onSubmit={sendOtp}>
              <label style={s.label}>Phone number</label>
              <input style={input.base} type="tel" value={phone}
                onChange={e => setPhone(e.target.value)} placeholder="e.g. 0779710365" required />
              {msg && <div style={alert.error}>{msg}</div>}
              <button type="submit" style={{ ...btn.primary, marginTop: 16 }} disabled={loading}>
                {loading ? 'Sending code…' : 'Send OTP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp}>
              <p style={{ ...s.muted, marginBottom: 16 }}>Enter the 6-digit code sent to <strong>{phone}</strong></p>
              <label style={s.label}>OTP code</label>
              <input style={{ ...input.base, letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
                type="text" inputMode="numeric" maxLength={6}
                value={otp} onChange={e => setOtp(e.target.value)} placeholder="______" required />
              {msg && <div style={alert.error}>{msg}</div>}
              <button type="submit" style={{ ...btn.primary, marginTop: 16 }} disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & Sign in'}
              </button>
              <button type="button" style={{ ...btn.outline, width: '100%', marginTop: 8 }}
                onClick={() => { setStep('phone'); setMsg('') }}>← Change number</button>
            </form>
          )}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 16 }}>
          Don&apos;t have an account? <a href="/join" style={{ color: '#6c47ff' }}>Join here</a>
        </p>
      </div>
    </div>
  )
}
