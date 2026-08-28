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
| `mesa-directiva.html` | Minuta del 10 de agosto de 2026 y seguimiento de los 12 acuerdos |
| `finanzas.html` | Rendición de cuentas. **Acceso abierto, sin clave.** |

## Origen de la información

- **Reglamento de Condominio y Administración del Conjunto "Misiones"**, protocolizado ante
  la Notaría Pública No. 7 del Estado de Querétaro. Cada regla citada en el sitio lleva su
  número de artículo.
- **Minuta de la mesa directiva del 10 de agosto de 2026** (Ale, Naydelin y Eduardo).

Todo lo que no proviene de esas dos fuentes está marcado en el sitio como **propuesta** o
**por definir**: horarios de áreas comunes, reglas de residuos, horario de oficina y datos
de contacto. No rigen hasta que la asamblea los apruebe.

## Finanzas

La sección es pública y **no tiene clave**. Por eso solo contiene agregados.

`js/data.js` mantiene `MISIONES.meses` vacío: mientras esté así, cada métrica se pinta con
un guion (—) y el sitio explica qué se publicará ahí. En cuanto la administración entregue
la hoja de cálculo mensual, se agrega un objeto por mes a ese arreglo —el formato está
documentado en el propio archivo— y los mismos bloques se llenan solos, incluidas las dos
gráficas.

**Regla de privacidad:** nunca se sube información por departamento ni nombres de
condóminos. La morosidad se publica agregada (monto y número de unidades). Lo que vive en
este repositorio es legible por cualquiera que abra la dirección del sitio.

## Estructura

```
index.html  reglamento.html  areas-comunes.html  mesa-directiva.html  finanzas.html
css/styles.css
js/data.js        · cifras y catálogo de proyectos
js/finanzas.js    · render del tablero financiero (maneja el estado "sin datos")
assets/mark.svg   · marca compacta, se usa en el encabezado y como favicon
assets/logo.svg   · lockup completo "Las Misiones Residencial"
```

Sin dependencias, sin build: HTML, CSS y JavaScript planos.
