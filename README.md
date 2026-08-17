# Credito Simple - Demo

Prototipo responsive para presentar un sistema de gestion de prestamos personales.

## Incluye

- Dashboard con capital colocado, cobrado historico, mora y **rentabilidad**: ganancia neta y proyectada sobre el capital invertido, mas la perdida acumulada por incobrables.
- Base inicial de 20 clientes ficticios, con historial de cobros consistente desde el primer ingreso.
- Listado de cuotas por cobrar y clientes atrasados, priorizado por urgencia.
- Marcar un prestamo atrasado como incobrable (con confirmacion) para reflejar la perdida de capital en el dashboard.
- Historial de prestamos con la ganancia cobrada por cada uno.
- Simulador de nuevo prestamo con interes base del 100%.
- Plan de cuotas mensuales automatico.
- Vista de cobranzas.
- Login de prueba con usuario y contrasena:
  - nicolas / admin123: admin sistema, puede apagar o activar el programa.
  - duenio / prestamos123: admin negocio, puede operar prestamos y cobros.
- Carga de nuevos prestamos demo.
- Registro de cobros con avance de cuotas pagas.
- Persistencia local en el navegador para hacer pruebas reales sin backend.
- Layout responsive para celular.
- Confirmacion antes de reiniciar la demo o dar de baja un prestamo, para evitar perder datos por error.
- Backend real con Supabase: autenticacion (Auth) y datos (Postgres) en vez de localStorage.
- Portal del deudor (`cuenta.html`): al crear un prestamo se genera un link unico por prestamo. El cliente lo abre, confirma su DNI, y ve su deuda, cuotas pagas/pendientes y proximo vencimiento sin necesitar usuario ni contrasena.
- Confirmaciones y avisos con modal/toast propios en vez de los `confirm`/`alert` nativos del navegador, con estados de "guardando..." en los botones mientras se espera la respuesta del servidor.

## Backend (Supabase)

La app se conecta a un proyecto de Supabase real. Ver `supabase-client.js` para la URL y la anon key (publica, segura para el frontend), y `supabase/migrations/` para el esquema.

Para levantar un proyecto nuevo desde cero:

1. Crear el proyecto en [supabase.com](https://supabase.com).
2. Correr `supabase/migrations/0001_init.sql` en el SQL Editor del proyecto (crea tablas, RLS, funciones y carga los 20 clientes de demo).
3. Crear los 2 usuarios en Authentication > Users (con "Auto Confirm User" activado):
   - `nicodiax22@gmail.com` -> se le asigna el rol `system_admin`.
   - `duenio@creditosimple.demo` -> se le asigna el rol `owner_admin`.
4. Correr `supabase/migrations/0002_profiles.sql` para asignarles el rol.
5. Actualizar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `supabase-client.js` con los datos de Project Settings > API.

El login de la UI sigue pidiendo "usuario" (`nicolas` / `duenio`) por compatibilidad visual, pero autentica contra Supabase Auth usando el email real mapeado en `LOGIN_EMAILS` (`app.js`).

### Portal del deudor

Cada prestamo tiene un `public_token` (uuid) generado automaticamente. El link `cuenta.html?token=<public_token>` se muestra una sola vez, en el mensaje de exito al cargar el prestamo desde `Prestamos > Nuevo prestamo`, con boton para copiarlo.

`cuenta.html` es publica (no requiere login): pide el DNI del cliente y llama a la funcion `get_loan_by_token(token, dni)` en Supabase (SQL Editor: ver `0004_debtor_portal.sql`), que valida que el DNI coincida con el del prestamo antes de devolver los datos. Sin el token correcto en la URL no hay forma de listar ni adivinar otras cuentas.

## Como verlo

Abrir `index.html` en el navegador.

Al entrar, usar uno de los usuarios de prueba. Para volver al estado inicial, usar `Reiniciar demo` en la vista de cobranzas.

La logica base es:

```txt
total_a_devolver = monto_prestado + (monto_prestado * interes / 100)
```

Con 100% de interes:

```txt
total_a_devolver = monto_prestado * 2
```
