// Shared style tokens — keeps all pages consistent
export const s = {
  h1:    { fontSize: 22, fontWeight: 600, margin: '0 0 6px', color: '#111' },
  h2:    { fontSize: 18, fontWeight: 600, margin: '16px 0 8px', color: '#111' },
  h3:    { fontSize: 14, fontWeight: 600, color: '#111', margin: '0 0 4px' },
  muted: { color: '#666', fontSize: 14, margin: '0 0 4px', lineHeight: 1.6 },
  label: { display: 'block', fontSize: 13, color: '#555', marginBottom: 5, marginTop: 16 },
  center:{ textAlign: 'center', padding: '32px 16px' },
  spinner: {
    width: 40, height: 40, border: '3px solid #e5e7eb',
    borderTop: '3px solid #6c47ff', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
  },
  checkIcon: {
    width: 56, height: 56, borderRadius: '50%', background: '#dcfce7',
    color: '#16a34a', fontSize: 28, display: 'flex', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 16px',
  },
  pills:  { display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  pill:   { border: '1.5px solid', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 90, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 },
  pillLabel: { fontSize: 11, color: '#888' },
  netGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 },
  netBtn:  { border: '1.5px solid', borderRadius: 10, padding: 12, background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', transition: 'all 0.15s', fontSize: 13 },
  netDot:  { width: 32, height: 32, borderRadius: '50%', flexShrink: 0 },
  row:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #f3f4f6' },
  badge:  (color) => ({ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: color + '18', color }),
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  stat:   { background: '#f9f9f9', borderRadius: 10, padding: '14px 16px' },
  statVal:{ fontSize: 22, fontWeight: 600, color: '#111', margin: '4px 0 0' },
  statLbl:{ fontSize: 12, color: '#888' },
}

export const card = {
  raised: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px 20px', marginBottom: 16 },
  flat:   { background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, padding: '16px', marginBottom: 12 },
}

export const btn = {
  primary:  { width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', background: '#6c47ff', color: '#fff', opacity: 1 },
  danger:   { width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', background: '#dc2626', color: '#fff' },
  outline:  { padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', background: 'transparent', color: '#111' },
  copy:     { padding: '8px 14px', fontSize: 13, fontWeight: 500, border: '1px solid #6c47ff', borderRadius: 8, cursor: 'pointer', background: '#f3f0ff', color: '#6c47ff' },
}

export const input = {
  base: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, outline: 'none', background: '#fafafa', boxSizing: 'border-box' },
}

export const alert = {
  error:   { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 12 },
  success: { background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 12 },
  info:    { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 12 },
}
