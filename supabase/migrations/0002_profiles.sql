-- Correr DESPUES de crear los usuarios en Authentication > Users
-- (Project > Authentication > Users > Add user, con "Auto Confirm User" activado).
-- Asigna el rol segun el email, buscando el id en auth.users.

insert into profiles (id, role, full_name)
select id, 'system_admin', 'Nicolas'
from auth.users
where email = 'nicodiax22@gmail.com'
on conflict (id) do update set role = excluded.role;

insert into profiles (id, role, full_name)
select id, 'owner_admin', 'Duenio'
from auth.users
where email = 'duenio@creditosimple.demo'
on conflict (id) do update set role = excluded.role;

-- Verificacion: deberia devolver las 2 filas con su rol.
select p.role, p.full_name, u.email
from profiles p
join auth.users u on u.id = p.id;
