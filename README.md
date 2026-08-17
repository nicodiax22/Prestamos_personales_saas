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
