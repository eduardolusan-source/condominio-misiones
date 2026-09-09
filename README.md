# Las Misiones Residencial — sitio informativo

Sitio estático del Conjunto Habitacional en Condominio "Misiones", Senda Eterna 444,
Fraccionamiento Milenio III, Santiago de Querétaro, Qro. 16 unidades privativas.
Administración: Admin-Solutions.

Publicado con GitHub Pages: https://eduardolusan-source.github.io/condominio-misiones/

## Páginas

| Archivo | Contenido |
|---|---|
| `index.html` | Portada: accesos, preguntas frecuentes del reglamento, áreas comunes, avisos, quién es quién |
| `reglamento.html` | Resumen en lenguaje claro del reglamento protocolizado, capítulo por capítulo |
| `areas-comunes.html` | Qué es área común, y reglas por espacio (acceso, salón, alberca, estacionamiento, elevador, jardines, agua, residuos) |
| `pendientes.html` | Protocolización de la mesa directiva (acuerdo de asamblea), minuta del 10 de agosto de 2026 y seguimiento de los 12 acuerdos. Antes se llamaba "Mesa directiva"; `mesa-directiva.html` redirige aquí |
| `finanzas.html` | Rendición de cuentas 2025 y enero–junio 2026. **Acceso abierto, sin clave.** |

## Origen de la información

- **Reglamento de Condominio y Administración del Conjunto "Misiones"**, protocolizado ante
  la Notaría Pública No. 7 del Estado de Querétaro. Cada regla citada en el sitio lleva su
  número de artículo.
- **Minuta de la mesa directiva del 10 de agosto de 2026** (Ale, Naydelin y Eduardo).
- **Acta de asamblea, asuntos generales**: protocolización de la mesa directiva y cuota
  extraordinaria de $1,000 por departamento, aprobada por unanimidad.
- **Tablas contables de ingresos y egresos 2025 y 2026** y **estados de cuenta de las 16
  unidades al 22 de junio de 2026**, entregados por Admin-Solutions.

Todo lo que no proviene de esas fuentes está marcado en el sitio como **propuesta** o
**por definir**: horarios de áreas comunes, reglas de residuos, horario de oficina y datos
de contacto. No rigen hasta que la asamblea los apruebe.

## Finanzas

Misma lógica que los sitios de Lahia y La Valetta: vista general del año (tarjetas, tabla
mes por mes, gráficas de ingresos/egresos y saldo, composición del gasto ordinario, el agua
en cifras) y detalle por mes al que se entra tocando una fila de la tabla. Aquí además se
puede cambiar de año (2025 y 2026).

**Corte: junio de 2026.** Falta que la administración reporte los cambios y los datos de
julio y de agosto a la fecha. El aviso está en la propia página y en `pendientes.html`.

`js/data.js` contiene:

- `meses`: un objeto por mes con saldo inicial y final, ingresos (mantenimiento, agua,
  cuota del elevador, medidores, otros), egresos (ordinarios y extraordinarios), cobranza
  por mes facturado y el desglose por concepto tal como viene en la tabla contable.
- `morosidad`: foto agregada al 22 de junio de 2026 (unidades y montos, sin identificar).
- `proyectos`: obras con cuota extraordinaria.
- `revision`: incongruencias y observaciones encontradas al cotejar las tablas contables
  con los estados de cuenta. Se muestran en la sección "Revisión de los documentos".

Para publicar un mes nuevo: agregar su objeto a `meses` (el formato está documentado en el
propio archivo), actualizar `morosidad` con la foto del nuevo corte y ajustar el texto del
aviso de corte en `finanzas.html`, `index.html` y `pendientes.html`.

**Regla de privacidad:** nunca se sube información por departamento ni nombres de
condóminos. La morosidad se publica agregada (monto y número de unidades). Lo que vive en
este repositorio es legible por cualquiera que abra la dirección del sitio.

## Estructura

```
index.html  reglamento.html  areas-comunes.html  pendientes.html  finanzas.html
mesa-directiva.html   · redirección a pendientes.html (enlaces antiguos)
css/styles.css
js/data.js            · cifras 2025–2026, morosidad agregada, proyectos y revisión
js/finanzas.js        · render del tablero financiero (año, vista general, detalle por mes)
assets/logo.svg       · logotipo vectorial (fondo claro), redibujado a partir del logo original
assets/logo-dark.svg  · misma versión para modo oscuro
assets/mark.svg       · marca compacta, favicon
```

Sin dependencias, sin build: HTML, CSS y JavaScript planos.
