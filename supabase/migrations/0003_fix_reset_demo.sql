-- Fix: el proyecto exige WHERE en los DELETE. reset_demo() fallaba con
-- "DELETE requires a WHERE clause". Correr esto en el SQL Editor para
-- reemplazar la funcion ya creada por 0001_init.sql.

create or replace function reset_demo() returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_role_name() <> 'system_admin' then
    raise exception 'not authorized';
  end if;

  delete from payments where true;
  delete from loans where true;

  insert into loans (id, client_id, amount, interest_percent, installment_count, installments_paid, due_day, status) values
    (1, 1, 120000, 100, 4, 2, 15, 'al dia'),
    (2, 2, 85000, 100, 3, 1, 15, 'vence hoy'),
    (3, 3, 200000, 100, 5, 2, 8, 'atrasado'),
    (4, 4, 150000, 100, 6, 4, 22, 'al dia'),
    (5, 5, 100000, 100, 4, 1, 5, 'atrasado'),
    (6, 6, 70000, 100, 2, 1, 28, 'al dia'),
    (7, 7, 180000, 100, 6, 3, 15, 'vence hoy'),
    (8, 8, 95000, 100, 3, 2, 20, 'al dia'),
    (9, 9, 250000, 100, 8, 3, 1, 'atrasado'),
    (10, 10, 60000, 100, 2, 1, 18, 'al dia'),
    (11, 11, 130000, 100, 4, 2, 15, 'vence hoy'),
    (12, 12, 110000, 100, 5, 2, 26, 'al dia'),
    (13, 13, 90000, 100, 3, 0, 9, 'atrasado'),
    (14, 14, 170000, 100, 6, 5, 24, 'al dia'),
    (15, 15, 50000, 100, 2, 1, 17, 'al dia'),
    (16, 16, 210000, 100, 7, 4, 15, 'vence hoy'),
    (17, 17, 140000, 100, 4, 3, 27, 'al dia'),
    (18, 18, 300000, 100, 10, 4, 3, 'atrasado'),
    (19, 19, 75000, 100, 3, 2, 19, 'al dia'),
    (20, 20, 160000, 100, 6, 3, 23, 'al dia');

  insert into payments (loan_id, amount, installment_number, payment_date) values
    (1, 60000.00, 1, now()), (1, 60000.00, 2, now()),
    (2, 56666.67, 1, now()),
    (3, 80000.00, 1, now()), (3, 80000.00, 2, now()),
    (4, 50000.00, 1, now()), (4, 50000.00, 2, now()), (4, 50000.00, 3, now()), (4, 50000.00, 4, now()),
    (5, 50000.00, 1, now()),
    (6, 70000.00, 1, now()),
    (7, 60000.00, 1, now()), (7, 60000.00, 2, now()), (7, 60000.00, 3, now()),
    (8, 63333.33, 1, now()), (8, 63333.33, 2, now()),
    (9, 62500.00, 1, now()), (9, 62500.00, 2, now()), (9, 62500.00, 3, now()),
    (10, 60000.00, 1, now()),
    (11, 65000.00, 1, now()), (11, 65000.00, 2, now()),
    (12, 44000.00, 1, now()), (12, 44000.00, 2, now()),
    (14, 56666.67, 1, now()), (14, 56666.67, 2, now()), (14, 56666.67, 3, now()), (14, 56666.67, 4, now()), (14, 56666.67, 5, now()),
    (15, 50000.00, 1, now()),
    (16, 60000.00, 1, now()), (16, 60000.00, 2, now()), (16, 60000.00, 3, now()), (16, 60000.00, 4, now()),
    (17, 70000.00, 1, now()), (17, 70000.00, 2, now()), (17, 70000.00, 3, now()),
    (18, 60000.00, 1, now()), (18, 60000.00, 2, now()), (18, 60000.00, 3, now()), (18, 60000.00, 4, now()),
    (19, 50000.00, 1, now()), (19, 50000.00, 2, now()),
    (20, 53333.33, 1, now()), (20, 53333.33, 2, now()), (20, 53333.33, 3, now());

  perform setval('loans_id_seq', 20);

  update settings set program_enabled = true, updated_at = now() where id = 1;
end;
$$;
