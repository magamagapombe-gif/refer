-- ══════════════════════════════════════════════════════════════
--  Wallet helper RPCs — called by /api/withdraw route
-- ══════════════════════════════════════════════════════════════

-- Safely debit wallet — errors if balance insufficient
create or replace function debit_wallet(p_user_id uuid, p_amount bigint)
returns void language plpgsql as $$
begin
  update users
    set wallet_balance    = wallet_balance - p_amount,
        total_withdrawn   = total_withdrawn + p_amount
    where id = p_user_id
      and wallet_balance >= p_amount
      and is_active = true;

  if not found then
    raise exception 'Insufficient balance or inactive account';
  end if;
end;
$$;

-- Refund wallet (used when LivePay send fails)
create or replace function credit_wallet(p_user_id uuid, p_amount bigint)
returns void language plpgsql as $$
begin
  update users
    set wallet_balance = wallet_balance + p_amount
    where id = p_user_id;
end;
$$;
