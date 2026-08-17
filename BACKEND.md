# Backend - Credito Simple

Diseno inicial para convertir la demo en un sistema real de gestion de prestamos personales.

## Stack recomendado

- Frontend: Vercel.
- Base de datos: Supabase Postgres.
- Autenticacion: Supabase Auth.
- API inicial: Supabase client desde la app.
- API avanzada futura: Next.js API Routes o backend Node si se necesitan reglas mas complejas.

## Entidades principales

### users

Usuarios que pueden entrar al sistema.

- id
- email
- full_name
- role: system_admin, owner_admin, cobrador, consulta
- tenant_id
- created_at

Roles iniciales:

- system_admin: Nicolas. Puede habilitar/apagar cuentas y administrar el programa.
- owner_admin: duenio del negocio. Puede ver todo, crear prestamos y registrar cobros.
- cobrador: futuro perfil limitado a clientes asignados.
- consulta: solo lectura.

### tenants

Cuenta del cliente que usa el sistema.

- id
- business_name
- owner_user_id
- program_enabled
- payment_status: trial, active, overdue, suspended
- created_at
- updated_at

### clients

Personas que toman prestamos.

- id
- full_name
- dni
- phone
- address
- zone
- reference_name
- reference_phone
- status: activo, al_dia, atrasado, bloqueado
- notes
- created_at

### loans

Prestamos otorgados.

- id
- client_id
- principal_amount
- interest_percent
- total_to_return
- installment_count
- installment_amount
- start_date
- first_due_date
- due_day
- status: activo, cancelado, vencido, refinanciado, incobrable
- created_by
- created_at

Regla base:

```txt
total_to_return = principal_amount + (principal_amount * interest_percent / 100)
installment_amount = total_to_return / installment_count
```

Para el caso habitual:

```txt
interest_percent = 100
total_to_return = principal_amount * 2
```

### installments

Cuotas mensuales generadas automaticamente al crear un prestamo.

- id
- loan_id
- installment_number
- due_date
- amount
- paid_amount
- status: pendiente, parcial, pagada, vencida
- paid_at
- created_at

### payments

Pagos registrados.

- id
- installment_id
- loan_id
- client_id
- amount
- payment_method: efectivo, transferencia, mercado_pago, otro
- payment_date
- note
- registered_by
- created_at

### cash_movements

Movimientos de caja para controlar entradas y salidas.

- id
- type: ingreso, egreso
- category: cobranza, prestamo_entregado, ajuste, gasto
- amount
- description
- related_payment_id
- related_loan_id
- created_by
- created_at

## Vistas necesarias

### Dashboard

- Capital colocado activo.
- Total a devolver.
- Cobranza del dia.
- Monto vencido.
- Clientes atrasados.
- Proximas cuotas.
- Ganancia neta cobrada y rentabilidad (%) sobre el capital invertido.
- Ganancia proyectada (interes pendiente de los prestamos activos).
- Perdida acumulada por capital de prestamos marcados incobrables.

### Clientes

- Busqueda por nombre, DNI o telefono.
- Filtros por estado y zona.
- Historial de prestamos y pagos.

### Prestamos

- Crear prestamo.
- Generar cuotas automaticas.
- Ver plan de pagos.
- Marcar como cancelado/refinanciado.

### Cobranzas

- Ver cuotas vencidas.
- Ver cuotas que vencen hoy.
- Registrar pago total o parcial.
- Generar recibo simple.

### Caja

- Entradas por cobranza.
- Salidas por prestamos entregados.
- Resumen diario, semanal y mensual.

## Reglas de negocio iniciales

- El interes por defecto es 100%, editable por prestamo.
- Las cuotas son mensuales.
- Un pago puede ser parcial.
- Una cuota queda vencida si paso su fecha y no esta pagada.
- Al registrar un pago se actualiza la cuota y se crea un movimiento de caja.
- Si se entrega un prestamo, se registra un egreso de caja.

## Seguridad

- Cada usuario debe iniciar sesion.
- Las contrasenas nunca se guardan en texto plano; Supabase Auth las administra con hash seguro.
- La demo actual usa credenciales fijas en el frontend solo para probar el flujo comercial.
- System admin puede habilitar/apagar el programa por cuenta.
- Owner admin ve todo dentro de su cuenta.
- Cobrador puede ver clientes asignados y registrar pagos.
- Consulta solo lectura.
- Si `program_enabled = false`, el duenio y sus usuarios no pueden operar.
- Usar Row Level Security en Supabase antes de pasar a produccion.

## Etapas de implementacion

### Etapa 1 (implementado)

- [x] Crear proyecto Supabase.
- [x] Crear tablas (`profiles`, `settings`, `clients`, `loans`, `payments` — ver `supabase/migrations/0001_init.sql`).
- [x] Migrar los 20 clientes de demo como seed.
- [x] Conectar login (Supabase Auth, ver `supabase-client.js` y `app.js`).
- [x] Crear roles system_admin y owner_admin (tabla `profiles`, ver `supabase/migrations/0002_profiles.sql`).
- [x] Agregar control `program_enabled` (tabla `settings`, singleton).
- [x] Leer clientes, prestamos y cuotas desde la base real.

Simplificaciones respecto al diseno original: no hay tabla `installments` separada (las cuotas se resumen en `loans.installment_count` / `installments_paid`, igual que en la demo original) ni `tenants` (una sola cuenta/negocio por ahora). `cash_movements` queda para Etapa 3.

### Portal del deudor (agregado fuera del diseno original)

- `loans.public_token` (uuid unico, generado solo) identifica el link publico de cada prestamo.
- Funcion `get_loan_by_token(p_token, p_dni)` (security definer, sin RLS involucrado): busca el prestamo por token, valida que el DNI ingresado coincida (normalizando puntos/espacios) y devuelve un JSON con los datos del prestamo, cliente y pagos. Si el token o el DNI no coinciden, devuelve `null` sin distinguir cual de los dos fallo.
- `anon` y `authenticated` tienen `execute` sobre esa funcion; no hay policy de `select` publica sobre `loans`/`clients`/`payments`, asi que no se puede leer nada sin pasar por la funcion y su verificacion de DNI.
- El link (`cuenta.html?token=...`) se genera y muestra una unica vez al crear el prestamo (`app.js` -> `createLoan`).

### Etapa 2

- Crear prestamos reales.
- Generar cuotas automaticamente.
- Registrar pagos.
- Calcular mora y dashboard desde datos reales.

### Etapa 3

- Roles.
- Caja.
- Recibos.
- Exportacion.
- Recordatorios por WhatsApp.
