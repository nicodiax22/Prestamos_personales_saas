-- Permite que el perfil duenio/admin negocio gestione la base de clientes
-- desde la app, mientras el programa este activo.

create policy "clients: insert if can_operate" on clients
  for insert with check (can_operate());

create policy "clients: update if can_operate" on clients
  for update using (can_operate());

create policy "clients: delete if can_operate" on clients
  for delete using (can_operate());
