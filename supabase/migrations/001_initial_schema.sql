-- ══════════════════════════════════════════════════════════════
--  CashLoop UG — Initial Schema
--  Run this in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── ENUM types ────────────────────────────────────────────────
create type user_rank      as enum ('starter','bronze','silver','gold','diamond');
create type txn_type       as enum ('credit','debit');
create type txn_source     as enum ('referral_l1','referral_l2','referral_l3','withdrawal','bonus','registration');
create type txn_status     as enum ('pending','completed','failed');
create type withdraw_status as enum ('pending','processing','completed','failed');
create type network_type   as enum ('MTN','AIRTEL');

-- ══════════════════════════════════════════════════════════════
--  TABLE: users
-- ══════════════════════════════════════════════════════════════
create table users (
  id                    uuid primary key default gen_random_uuid(),
  phone                 text not null unique,                -- normalized: 256XXXXXXXXX
  name                  text not null,
  referral_code         text not null unique,               -- e.g. CL-MATOVU7
  referred_by           uuid references users(id),          -- null for root members
  rank                  user_rank not null default 'starter',
  is_active             boolean not null default false,     -- true after payment confirmed
  wallet_balance        bigint not null default 0,          -- UGX, stored in shillings
  total_earned          bigint not null default 0,
  total_withdrawn       bigint not null default 0,
  direct_referral_count integer not null default 0,
  created_at            timestamptz not null default now(),
  activated_at          timestamptz                         -- set when payment confirmed
);

-- ── Indexes ───────────────────────────────────────────────────
create index on users(referral_code);
create index on users(referred_by);
create index on users(phone);

-- ── Auto-generate referral code ───────────────────────────────
create or replace function generate_referral_code()
returns trigger language plpgsql as $$
declare
  code text;
  exists boolean;
begin
  loop
    -- CL- + 6 uppercase alphanumeric chars
    code := 'CL-' || upper(substring(encode(gen_random_bytes(4),'hex') from 1 for 6));
    select count(*) > 0 into exists from users where referral_code = code;
    exit when not exists;
  end loop;
  new.referral_code := code;
  return new;
end;
$$;

create trigger trg_referral_code
  before insert on users
  for each row
  when (new.referral_code is null or new.referral_code = '')
  execute function generate_referral_code();

-- ══════════════════════════════════════════════════════════════
--  TABLE: registrations  (tracks payment attempts)
-- ══════════════════════════════════════════════════════════════
create table registrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  livepay_ref   text not null unique,           -- reference from LivePay /collect
  amount        bigint not null default 30000,  -- UGX 30,000 registration fee
  network       network_type not null,
  status        txn_status not null default 'pending',
  payload       jsonb,                          -- full LivePay response stored here
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz
);

create index on registrations(livepay_ref);
create index on registrations(user_id);
create index on registrations(status) where status = 'pending';

-- ══════════════════════════════════════════════════════════════
--  TABLE: transactions  (wallet ledger)
-- ══════════════════════════════════════════════════════════════
create table transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        txn_type not null,
  source      txn_source not null,
  amount      bigint not null check (amount > 0),    -- always positive; type tells direction
  description text,
  livepay_ref text,
  status      txn_status not null default 'completed',
  created_at  timestamptz not null default now()
);

create index on transactions(user_id);
create index on transactions(created_at desc);

-- ══════════════════════════════════════════════════════════════
--  TABLE: withdrawals
-- ══════════════════════════════════════════════════════════════
create table withdrawals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  amount       bigint not null check (amount >= 10000), -- min UGX 10,000
  fee          bigint not null,                         -- 5% platform fee
  net_amount   bigint not null,                         -- amount - fee; sent via LivePay
  phone        text not null,
  network      network_type not null,
  status       withdraw_status not null default 'pending',
  livepay_ref  text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index on withdrawals(user_id);
create index on withdrawals(status) where status in ('pending','processing');

-- ══════════════════════════════════════════════════════════════
--  FUNCTION: distribute_commissions
--  Called once after registration payment is confirmed.
--  Walks up referred_by chain max 3 levels, credits each.
-- ══════════════════════════════════════════════════════════════
create or replace function distribute_commissions(p_new_user_id uuid, p_reg_fee bigint)
returns void language plpgsql as $$
declare
  SPLIT bigint[]  := array[
    (p_reg_fee * 40 / 100),   -- L1: 40%
    (p_reg_fee * 15 / 100),   -- L2: 15%
    (p_reg_fee * 5  / 100)    -- L3: 5%
  ];
  SOURCE txn_source[] := array['referral_l1','referral_l2','referral_l3'];
  cur_id   uuid;
  parent_id uuid;
  lvl      int := 1;
begin
  -- Start from the new user's referrer
  select referred_by into cur_id from users where id = p_new_user_id;

  while cur_id is not null and lvl <= 3 loop
    -- Credit wallet
    update users
      set wallet_balance  = wallet_balance + SPLIT[lvl],
          total_earned    = total_earned   + SPLIT[lvl]
      where id = cur_id and is_active = true;

    -- Only log if the referrer actually exists and is active
    if found then
      insert into transactions(user_id, type, source, amount, description)
      values (
        cur_id,
        'credit',
        SOURCE[lvl],
        SPLIT[lvl],
        'Commission from new member registration (level ' || lvl || ')'
      );
    end if;

    -- Increment direct referral count for L1 only and update rank
    if lvl = 1 then
      update users
        set direct_referral_count = direct_referral_count + 1,
            rank = case
              when direct_referral_count + 1 >= 50 then 'diamond'::user_rank
              when direct_referral_count + 1 >= 30 then 'gold'::user_rank
              when direct_referral_count + 1 >= 15 then 'silver'::user_rank
              when direct_referral_count + 1 >= 5  then 'bronze'::user_rank
              else 'starter'::user_rank
            end
        where id = cur_id;
    end if;

    -- Walk up one level
    select referred_by into parent_id from users where id = cur_id;
    cur_id := parent_id;
    lvl := lvl + 1;
  end loop;
end;
$$;

-- ══════════════════════════════════════════════════════════════
--  FUNCTION: confirm_registration
--  Call this when LivePay confirms payment. Activates user
--  and triggers commission distribution atomically.
-- ══════════════════════════════════════════════════════════════
create or replace function confirm_registration(p_livepay_ref text, p_payload jsonb default '{}')
returns jsonb language plpgsql as $$
declare
  reg  registrations%rowtype;
  fee  bigint;
begin
  -- Lock the registration row
  select * into reg
    from registrations
    where livepay_ref = p_livepay_ref and status = 'pending'
    for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Registration not found or already processed');
  end if;

  fee := reg.amount;

  -- Mark registration confirmed
  update registrations
    set status = 'completed', confirmed_at = now(), payload = p_payload
    where id = reg.id;

  -- Activate user
  update users
    set is_active = true, activated_at = now()
    where id = reg.user_id;

  -- Record user's own registration transaction
  insert into transactions(user_id, type, source, amount, description)
  values (reg.user_id, 'debit', 'registration', fee, 'One-time registration fee');

  -- Distribute commissions up the chain
  perform distribute_commissions(reg.user_id, fee);

  return jsonb_build_object('success', true, 'user_id', reg.user_id);
end;
$$;

-- ══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════
alter table users         enable row level security;
alter table transactions  enable row level security;
alter table withdrawals   enable row level security;
alter table registrations enable row level security;

-- Users can only see/edit their own rows
create policy "users: own row" on users
  for all using (auth.uid() = id);

create policy "transactions: own rows" on transactions
  for select using (auth.uid() = user_id);

create policy "withdrawals: own rows" on withdrawals
  for all using (auth.uid() = user_id);

create policy "registrations: own rows" on registrations
  for select using (auth.uid() = user_id);

-- Service role (used by API routes) bypasses RLS automatically

