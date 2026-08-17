# Flujo operativo

Como se mueve la informacion en Credito Simple: quien hace que, y que le pasa a un prestamo desde que se crea hasta que se cierra.

## 1. Ingreso y roles

```mermaid
flowchart TD
    A[Abre index.html] --> B{Sesion activa<br/>en el navegador?}
    B -- Si --> C[Busca el rol en la<br/>tabla profiles]
    B -- No --> D[Pantalla de login]
    D --> E[Ingresa usuario y contrasena]
    E --> F{Supabase Auth}
    F -- Credenciales invalidas --> D
    F -- OK --> C
    C --> G{Rol asignado}
    G -- system_admin --> H["Acceso total<br/>+ vista Sistema<br/>(nunca se bloquea)"]
    G -- owner_admin --> I{Programa activo<br/>para esta cuenta?}
    I -- Si --> J[Puede cargar prestamos<br/>y registrar cobros]
    I -- No --> K[Solo puede ver datos,<br/>no puede operar]
```

El "usuario" que se escribe en el login (`nicolas`, `duenio`) es solo una etiqueta corta para la UI: por debajo se traduce al email real de esa cuenta y se autentica contra Supabase Auth (`LOGIN_EMAILS` en `src/app.js`).

## 2. Ciclo de vida de un prestamo

```mermaid
flowchart LR
    N["Nuevo prestamo<br/>(estado inicial elegido<br/>a mano en el formulario)"] --> ST["al dia / vence hoy / atrasado"]
    ST -->|Cobrar cuota| CHK{Era la<br/>ultima cuota?}
    CHK -- No --> AD[al dia]
    CHK -- Si --> CA[cancelado]
    ST -->|"Marcar incobrable<br/>(solo si esta atrasado)"| IN[incobrable]
    AD -.-> ST
```

**Importante:** el sistema no cambia el estado solo con el paso del tiempo. `al dia`, `vence hoy` y `atrasado` son valores que carga la persona que opera (al crear el prestamo, o de forma manual); lo unico que el sistema cambia automaticamente es el avance de cuotas al registrar un cobro, y el pase a `cancelado` cuando se paga la ultima. Calcular la mora automaticamente por fecha queda para una proxima etapa (ver `BACKEND.md`, Etapa 2).

## 3. Portal del deudor

```mermaid
sequenceDiagram
    participant D as Dueno / Admin
    participant App as App + Supabase
    participant C as Cliente (deudor)

    D->>App: Crea el prestamo para un cliente
    App-->>D: Genera un public_token unico y arma el link
    D->>C: Comparte el link (WhatsApp, SMS, etc.)
    C->>App: Abre cuenta.html?token=...
    App-->>C: Pide el DNI
    C->>App: Ingresa su DNI
    App->>App: get_loan_by_token(token, dni)
    alt token y DNI coinciden
        App-->>C: Estado de cuenta:<br/>deuda, cuotas, proximo vencimiento
    else no coinciden
        App-->>C: "No pudimos verificar tus datos"
    end
```

El cliente nunca tiene una cuenta ni contrasena: el `token` del link mas su DNI son la unica llave. Sin el link no hay forma de encontrar ni listar prestamos de otra persona — no existe una vista publica que muestre todos los prestamos.
