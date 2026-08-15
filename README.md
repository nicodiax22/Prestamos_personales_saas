# Credito Simple - Demo

Prototipo responsive para presentar un sistema de gestion de prestamos personales.

## Incluye

- Dashboard con capital colocado, total a devolver, cobranza del dia y mora.
- Base inicial de 20 clientes ficticios.
- Listado de cuotas por cobrar y clientes atrasados.
- Simulador de nuevo prestamo con interes base del 100%.
- Plan de cuotas mensuales automatico.
- Vista de cobranzas.
- Accesos de prueba por perfil:
  - Nicolas / admin sistema: puede apagar o activar el programa.
  - Duenio / admin negocio: puede operar prestamos y cobros.
- Carga de nuevos prestamos demo.
- Registro de cobros con avance de cuotas pagas.
- Persistencia local en el navegador para hacer pruebas reales sin backend.
- Layout responsive para celular.

## Como verlo

Abrir `index.html` en el navegador.

Al entrar, elegir un perfil de prueba. Para volver al estado inicial, usar `Reiniciar demo` en la vista de cobranzas.

La logica base es:

```txt
total_a_devolver = monto_prestado + (monto_prestado * interes / 100)
```

Con 100% de interes:

```txt
total_a_devolver = monto_prestado * 2
```
