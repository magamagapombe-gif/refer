'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { s, card, btn, alert } from '@/lib/styles'

const SOURCE_LABEL = {
  referral_l1: 'L1 commission',
  referral_l2: 'L2 commission',
  referral_l3: 'L3 commission',
  withdrawal:  'Withdrawal',
  bonus:       'Bonus',
  registration:'Registration fee',
}
const RANK_COLOR = { starter:'#888', bronze:'#cd7f32', silver:'#6b7280', gold:'#d97706', diamond:'#6c47ff' }

export default function Dashboard() {
  const router = useRouter()
  const [data, setData]     = useState(null)
  const [error, setError]   = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => { if (r.status === 401) router.push('/auth/login'); return r.json() })
      .then(d => d.error ? setError(d.error) : setData(d))
      .catch(() => setError('Failed to load'))
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(data.referral_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!data) return <Shell><p style={s.muted}>{error || 'Loading…'}</p></Shell>

  const ugx = (n) => `UGX ${Number(n).toLocaleString()}`

  return (
    <Shell name={data.name} rank={data.rank}>
      {/* ── Stats ── */}
      <div style={s.statGrid}>
        <div style={s.stat}>
          <div style={s.statLbl}>Wallet balance</div>
          <div style={{ ...s.statVal, color: '#6c47ff' }}>{ugx(data.wallet_balance)}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLbl}>Total earned</div>
          <div style={s.statVal}>{ugx(data.total_earned)}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLbl}>Direct referrals</div>
          <div style={s.statVal}>{data.direct_referral_count}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLbl}>Total withdrawn</div>
          <div style={s.statVal}>{ugx(data.total_withdrawn)}</div>
        </div>
      </div>

      {/* ── Referral link ── */}
      <div style={card.raised}>
        <div style={s.h3}>Your referral link</div>
        <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', color: '#6c47ff', marginBottom: 12, wordBreak: 'break-all' }}>
          {data.referral_link}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn.copy} onClick={copyLink}>{copied ? '✓ Copied!' : 'Copy link'}</button>
          <button style={btn.outline} onClick={() => {
            const txt = `Join me on Refer and start earning!\n\nUse my link: ${data.referral_link}`
            window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank')
          }}>Share on WhatsApp</button>
        </div>
      </div>

      {/* ── Rank progress ── */}
      <div style={card.raised}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={s.h3}>Your rank</div>
          <span style={{ ...s.badge(RANK_COLOR[data.rank] || '#888'), fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>
            {data.rank.toUpperCase()}
          </span>
        </div>
        <RankBar count={data.direct_referral_count} />
      </div>

      {/* ── Withdraw button ── */}
      <button style={btn.primary} onClick={() => router.push('/dashboard/withdraw')}>
        Withdraw earnings →
      </button>

      {/* ── Referrals list ── */}
      {data.referrals.length > 0 && (
        <div style={{ ...card.raised, marginTop: 16 }}>
          <div style={s.h3}>Direct referrals ({data.referrals.length})</div>
          {data.referrals.map(r => (
            <div key={r.id} style={s.row}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <span style={s.badge(r.is_active ? '#16a34a' : '#d97706')}>
                {r.is_active ? 'Active' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Transactions ── */}
      <div style={{ ...card.raised, marginTop: 16 }}>
        <div style={s.h3}>Recent transactions</div>
        {data.transactions.length === 0
          ? <p style={{ ...s.muted, textAlign: 'center', padding: '20px 0' }}>No transactions yet</p>
          : data.transactions.map(t => (
            <div key={t.id} style={s.row}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{SOURCE_LABEL[t.source] || t.source}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <span style={{ fontWeight: 600, fontSize: 14, color: t.type === 'credit' ? '#16a34a' : '#dc2626' }}>
                {t.type === 'credit' ? '+' : '-'}{ugx(t.amount)}
              </span>
            </div>
          ))
        }
      </div>
    </Shell>
  )
}

function RankBar({ count }) {
  const ranks = [
    { name: 'Starter', min: 0,  max: 4,  color: '#888' },
    { name: 'Bronze',  min: 5,  max: 14, color: '#cd7f32' },
    { name: 'Silver',  min: 15, max: 29, color: '#6b7280' },
    { name: 'Gold',    min: 30, max: 49, color: '#d97706' },
    { name: 'Diamond', min: 50, max: 50, color: '#6c47ff' },
  ]
  const cur = ranks.findLast(r => count >= r.min) || ranks[0]
  const next = ranks[ranks.indexOf(cur) + 1]
  const pct = next ? Math.min(100, ((count - cur.min) / (next.min - cur.min)) * 100) : 100

  return (
    <>
      <div style={{ background: '#f3f4f6', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: pct + '%', height: '100%', background: cur.color, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888' }}>
        <span>{count} referrals</span>
        <span>{next ? `${next.min - count} more to reach ${next.name}` : 'Max rank!'}</span>
      </div>
    </>
  )
}

function Shell({ children, name, rank }) {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '0 0 40px' }}>
      <div style={{ background: '#6c47ff', color: '#fff', padding: '20px 20px 60px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Welcome back</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{name || '…'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btn.outline, color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
                onClick={() => router.push('/dashboard/referrals')}>Referrals</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 480, margin: '-40px auto 0', padding: '0 16px' }}>
        {children}
      </div>
    </div>
  )
}
