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
- role: admin, cobrador, consulta
- created_at

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
- status: activo, cancelado, vencido, refinanciado
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
- Admin ve todo.
- Cobrador puede ver clientes asignados y registrar pagos.
- Consulta solo lectura.
- Usar Row Level Security en Supabase antes de pasar a produccion.

## Etapas de implementacion

### Etapa 1

- Crear proyecto Supabase.
- Crear tablas.
- Migrar los 20 clientes de demo como seed.
- Conectar login.
- Leer clientes, prestamos y cuotas desde la base real.

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
