# Credito Simple

Sistema de gestion de prestamos personales: dashboard de rentabilidad, cobranzas, alta de prestamos y un portal para que cada cliente consulte su propia deuda. Backend real en Supabase (Auth + Postgres).

## Documentacion

- [`docs/manual-operador.md`](./docs/manual-operador.md) - guia de uso para el dueno del negocio (dia a dia: prestamos y cobros).
- [`docs/manual-administrador.md`](./docs/manual-administrador.md) - guia para el administrador del sistema (Nicolas): control de acceso, reinicio de demo, gestion en Supabase.
- [`docs/flujo-operativo.md`](./docs/flujo-operativo.md) - diagramas de flujo: login/roles, ciclo de vida de un prestamo, portal del deudor.
- [`BACKEND.md`](./BACKEND.md) - diseno de datos y etapas de implementacion.

## Estructura del proyecto

```txt
index.html              Panel de gestion (dueno / admin sistema)
cuenta.html              Portal publico del deudor
src/
  app.js                 Logica del panel de gestion
  cuenta.js               Logica del portal del deudor
  supabase-client.js      Conexion a Supabase (URL + anon key)
  styles.css               Estilos del panel de gestion
  cuenta.css                Estilos del portal del deudor
supabase/
  migrations/              Esquema SQL, RLS y funciones, en orden (0001, 0002, ...)
docs/
  manual-operador.md
  manual-administrador.md
  flujo-operativo.md
  screenshots/              Capturas usadas en los manuales
```

## Incluye

- Dashboard con capital colocado, cobrado historico, mora y **rentabilidad**: ganancia neta y proyectada sobre el capital invertido, mas la perdida acumulada por incobrables.
- Base inicial de 20 clientes ficticios, con historial de cobros consistente desde el primer ingreso.
- Listado de cuotas por cobrar y clientes atrasados, priorizado por urgencia.
- Marcar un prestamo atrasado como incobrable (con confirmacion) para reflejar la perdida de capital en el dashboard.
- Historial de prestamos con la ganancia cobrada por cada uno.
- Simulador de nuevo prestamo con interes base del 100%.
- Plan de cuotas mensuales automatico.
- Portal del deudor (`cuenta.html`): al crear un prestamo se genera un link unico. El cliente lo abre, confirma su DNI, y ve su deuda, cuotas pagas/pendientes y proximo vencimiento sin necesitar usuario ni contrasena.
- Backend real con Supabase: autenticacion (Auth) y datos (Postgres), con Row Level Security.
- Roles `system_admin` (Nicolas) y `owner_admin` (dueno del negocio), con control de encendido/apagado del programa por cuenta.
- Confirmaciones y avisos con modal/toast propios en vez de los `confirm`/`alert` nativos del navegador, con estados de "guardando..." en los botones mientras se espera la respuesta del servidor.
- Layout responsive para celular.

## Backend (Supabase)

La app se conecta a un proyecto de Supabase real. Ver `src/supabase-client.js` para la URL y la anon key (publica, segura para el frontend), y `supabase/migrations/` para el esquema completo.

Para levantar un proyecto nuevo desde cero:

1. Crear el proyecto en [supabase.com](https://supabase.com).
2. Correr `supabase/migrations/0001_init.sql` en el SQL Editor del proyecto (crea tablas, RLS, funciones y carga los 20 clientes de demo).
3. Crear los usuarios que van a operar el sistema en Authentication > Users (con "Auto Confirm User" activado si no hay email transaccional configurado).
4. Correr `supabase/migrations/0002_profiles.sql` (editando los emails) para asignarles el rol `system_admin` u `owner_admin`.
5. Actualizar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `src/supabase-client.js` con los datos de Project Settings > API.

El login de la UI pide "usuario" (no email) por compatibilidad visual: el mapeo a la cuenta real de Supabase Auth vive en `LOGIN_EMAILS` (`src/app.js`).

### Portal del deudor

Cada prestamo tiene un `public_token` (uuid) generado automaticamente. El link `cuenta.html?token=<public_token>` se muestra una sola vez, en el mensaje de exito al cargar el prestamo desde `Prestamos > Nuevo prestamo`, con boton para copiarlo.

`cuenta.html` es publica (no requiere login): pide el DNI del cliente y llama a la funcion `get_loan_by_token(token, dni)` en Supabase (ver `supabase/migrations/0004_debtor_portal.sql`), que valida que el DNI coincida con el del prestamo antes de devolver los datos. Sin el token correcto en la URL no hay forma de listar ni adivinar otras cuentas. Detalle completo del flujo en [`docs/flujo-operativo.md`](./docs/flujo-operativo.md).

## Como verlo

Abrir `index.html` en el navegador (o servirlo con cualquier servidor estatico).

Al entrar, usar un usuario ya dado de alta en el proyecto de Supabase. Con el perfil de administrador del sistema, `Reiniciar demo` (en la vista de cobranzas) vuelve todo al estado inicial.

La logica base de cada prestamo es:

```txt
total_a_devolver = monto_prestado + (monto_prestado * interes / 100)
```

Con 100% de interes:

```txt
total_a_devolver = monto_prestado * 2
```
