const API_KEY  = process.env.LIVEPAY_API_KEY
const ACCOUNT  = process.env.LIVEPAY_ACCOUNT_NUM
const BASE_URL = process.env.LIVEPAY_BASE_URL || 'https://livepay.me/api'

function normalizePhone(phone) {
  let p = String(phone).replace(/\D/g, '')
  if (p.startsWith('0'))   p = '256' + p.slice(1)
  if (!p.startsWith('256')) p = '256' + p
  return p
}

async function call(endpoint, body) {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) } }
  catch { return { ok: false, status: res.status, data: { error: text } } }
}

// ── Collect money from customer (registration fee / any payment)
export async function collectMoney({ phone, amount, network, reference, description }) {
  return call('collect-money', {
    accountNumber: ACCOUNT,
    phoneNumber:   normalizePhone(phone),
    amount:        Number(amount),
    currency:      'UGX',
    reference,
    description:   description || 'Refer payment',
    network,       // 'MTN' | 'AIRTEL'
  })
}

// ── Disburse money to a user (withdrawal payout)
export async function sendMoney({ phone, amount, reference, description }) {
  return call('send-money', {
    accountNumber: ACCOUNT,
    phoneNumber:   normalizePhone(phone),
    amount:        Number(amount),
    currency:      'UGX',
    reference,
    description:   description || 'Refer withdrawal',
  })
}

// ── Build a unique reference string (max 30 chars)
export function makeRef(prefix = 'CL') {
  return `${prefix}${Date.now()}`.slice(0, 30)
}
