# Credito Simple - Demo

Prototipo responsive para presentar un sistema de gestion de prestamos personales.

## Incluye

- Dashboard con capital colocado, total a devolver, cobranza del dia y mora.
- Base inicial de 20 clientes ficticios.
- Listado de cuotas por cobrar y clientes atrasados.
- Simulador de nuevo prestamo con interes base del 100%.
- Plan de cuotas mensuales automatico.
- Vista de cobranzas.
- Layout responsive para celular.

## Como verlo

Abrir `index.html` en el navegador.

La logica base es:

```txt
total_a_devolver = monto_prestado + (monto_prestado * interes / 100)
```

Con 100% de interes:

```txt
total_a_devolver = monto_prestado * 2
```
