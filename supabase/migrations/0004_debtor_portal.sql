-- Portal del deudor: cada prestamo tiene un link publico con token secreto.
-- El deudor abre el link, confirma su DNI, y ve el estado de su cuenta sin
-- necesitar usuario ni contrasena. Correr en el SQL Editor.

alter table loans add column public_token uuid not null default gen_random_uuid() unique;

create or replace function get_loan_by_token(p_token uuid, p_dni text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_loan loans%rowtype;
  v_client clients%rowtype;
  v_payments json;
begin
  select * into v_loan from loans where public_token = p_token;
  if not found then
    return null;
  end if;

  select * into v_client from clients where id = v_loan.client_id;

  if v_client.dni is null or regexp_replace(v_client.dni, '\D', '', 'g') <> regexp_replace(coalesce(p_dni, ''), '\D', '', 'g') then
    return null;
  end if;

  select coalesce(
    json_agg(
      json_build_object('installment_number', installment_number, 'amount', amount, 'payment_date', payment_date)
      order by installment_number
    ),
    '[]'::json
  )
  into v_payments
  from payments
  where loan_id = v_loan.id;

  return json_build_object(
    'client_name', v_client.full_name,
    'zone', v_client.zone,
    'amount', v_loan.amount,
    'interest_percent', v_loan.interest_percent,
    'installment_count', v_loan.installment_count,
    'installments_paid', v_loan.installments_paid,
    'due_day', v_loan.due_day,
    'status', v_loan.status,
    'first_due_date', v_loan.first_due_date,
    'created_at', v_loan.created_at,
    'payments', v_payments
  );
end;
$$;

grant execute on function get_loan_by_token(uuid, text) to anon, authenticated;
