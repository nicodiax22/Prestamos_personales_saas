-- Credito Simple - esquema inicial
-- Ejecutar en Supabase SQL Editor (Project > SQL Editor > New query > Run).

-- ============================================================
-- Tablas
-- ============================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('system_admin', 'owner_admin')),
  full_name text,
  created_at timestamptz not null default now()
);

create table settings (
  id smallint primary key default 1 check (id = 1),
  program_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into settings (id, program_enabled) values (1, true);

create table clients (
  id bigserial primary key,
  full_name text not null,
  dni text,
  phone text,
  zone text,
  created_at timestamptz not null default now()
);

create table loans (
  id bigserial primary key,
  client_id bigint not null references clients (id) on delete cascade,
  amount numeric not null check (amount > 0),
  interest_percent numeric not null default 100,
  installment_count int not null check (installment_count > 0),
  installments_paid int not null default 0,
  due_day int not null check (due_day between 1 and 31),
  status text not null default 'al dia' check (status in ('al dia', 'vence hoy', 'atrasado', 'cancelado', 'incobrable')),
  first_due_date date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table payments (
  id bigserial primary key,
  loan_id bigint not null references loans (id) on delete cascade,
  amount numeric not null check (amount > 0),
  installment_number int not null,
  payment_date timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index loans_client_id_idx on loans (client_id);
create index payments_loan_id_idx on payments (loan_id);

-- ============================================================
-- Helpers
-- ============================================================

create or replace function current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function can_operate() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p, settings s
    where p.id = auth.uid()
      and (s.program_enabled = true or p.role = 'system_admin')
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table settings enable row level security;
alter table clients enable row level security;
alter table loans enable row level security;
alter table payments enable row level security;

create policy "profiles: read own" on profiles
  for select using (auth.uid() = id);

create policy "settings: read if authenticated" on settings
  for select using (auth.uid() is not null);

create policy "settings: system_admin can update" on settings
  for update using (current_role_name() = 'system_admin');

create policy "clients: read if authenticated" on clients
  for select using (auth.uid() is not null);

create policy "loans: read if authenticated" on loans
  for select using (auth.uid() is not null);

create policy "loans: insert if can_operate" on loans
  for insert with check (can_operate());

create policy "loans: update if can_operate" on loans
  for update using (can_operate());

create policy "loans: delete if system_admin" on loans
  for delete using (current_role_name() = 'system_admin');

create policy "payments: read if authenticated" on payments
  for select using (auth.uid() is not null);

create policy "payments: insert if can_operate" on payments
  for insert with check (can_operate());

create policy "payments: delete if system_admin" on payments
  for delete using (current_role_name() = 'system_admin');

-- ============================================================
-- reset_demo(): borra prestamos/cobros y vuelve a cargar el seed original.
-- Solo puede ejecutarlo system_admin (lo llama la app via supabase.rpc).
-- ============================================================

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

-- ============================================================
-- Seed inicial (clientes, prestamos, cobros historicos)
-- ============================================================

insert into clients (id, full_name, dni, phone, zone) values
  (1, 'Martin Acosta', '31.456.908', '11 5842-0194', 'San Justo'),
  (2, 'Carolina Benitez', '28.334.710', '11 6039-2218', 'Ramos Mejia'),
  (3, 'Sergio Cabrera', '34.882.109', '11 5091-7730', 'Lomas del Mirador'),
  (4, 'Julieta Duarte', '37.115.492', '11 6274-9042', 'Moron'),
  (5, 'Pablo Espindola', '30.918.227', '11 5438-6811', 'Haedo'),
  (6, 'Romina Ferreyra', '39.221.084', '11 6021-4488', 'Ituzaingo'),
  (7, 'Gaston Gimenez', '27.881.940', '11 5983-7265', 'Castelar'),
  (8, 'Natalia Herrera', '35.604.218', '11 6110-3329', 'Ciudadela'),
  (9, 'Federico Ibarra', '32.440.673', '11 5304-8702', 'Merlo'),
  (10, 'Soledad Juarez', '40.078.133', '11 5694-1108', 'Moreno'),
  (11, 'Diego Ledesma', '29.712.554', '11 5900-7341', 'Padua'),
  (12, 'Melina Molina', '38.902.417', '11 6518-9033', 'Tapiales'),
  (13, 'Hector Navarro', '26.193.775', '11 5489-3340', 'Villa Luzuriaga'),
  (14, 'Paula Ojeda', '36.337.992', '11 6200-4419', 'La Tablada'),
  (15, 'Leonel Paredes', '33.840.661', '11 5772-8107', 'Isidro Casanova'),
  (16, 'Marina Quiroga', '41.225.380', '11 6304-1175', 'Moron'),
  (17, 'Rodrigo Rojas', '30.552.196', '11 5980-6509', 'San Justo'),
  (18, 'Valeria Silva', '37.846.701', '11 6122-7540', 'Haedo'),
  (19, 'Emanuel Torres', '28.991.450', '11 5366-2901', 'Ramos Mejia'),
  (20, 'Luciana Vega', '39.665.308', '11 6461-0874', 'Castelar');

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

select setval('clients_id_seq', 20);
select setval('loans_id_seq', 20);

-- ============================================================
-- Despues de correr esta migracion:
-- 1. Crear los 2 usuarios en Authentication > Users:
--      nicodiax22@gmail.com          (elegi una contrasena)
--      duenio@creditosimple.demo     (elegi una contrasena)
-- 2. Correr 0002_profiles.sql para asignarles el rol.
-- ============================================================
