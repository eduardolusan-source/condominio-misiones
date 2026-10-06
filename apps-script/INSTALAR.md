# Registro de pagos · instalación (una sola vez)

La hoja de Google es la fuente de verdad. El script vive dentro de la hoja y la
página `pago.html` del sitio le habla por una dirección que se obtiene al publicarlo.

## 1. La hoja ya es de Google
Si todavía fuera un `.xlsx`: abrirla y **Archivo → Guardar como hoja de cálculo de Google**.
Todo lo que sigue se hace en la hoja nueva.

## 2. Pegar el script
1. En la hoja: **Extensiones → Apps Script**.
2. Borrar lo que aparezca en `Código.gs` y pegar el contenido completo de `apps-script/Code.gs`.
3. Guardar (icono de disquete). Arriba, junto a "Ejecutar", elegir la función **instalar**.
4. **Ejecutar**. La primera vez pide permisos: "Revisar permisos" → tu cuenta → "Avanzado" →
   "Ir a … (no seguro)" → Permitir. Es normal: el script es tuyo y pide tocar tu hoja y tu Drive.
5. Al terminar sale un aviso en la hoja con lo que hizo:
   - pestañas de los meses que faltaban de 2026, copiadas de la plantilla;
   - en cada mes, la sección **Renta de casa club** gana una columna **Monto** y el resumen
     un renglón **(+) Casa club cobrada** que ya suma al saldo final y al total de ingresos;
   - pestañas nuevas **Pagos** (donde caen los reportes) y **Config** (cuota, extraordinario vigente, aviso);
   - carpeta de Drive **Misiones · Comprobantes**, con una subcarpeta por mes.

Pendiente a mano, solo en **Octubre**: el $500 de casa club quedó como extraordinario del
depto 2 (celda E32) y en el registro de casa club con "departamento 5". Déjalo en un solo lugar:
en el registro, Depto = 2, Monto = 500, y borra el 500 de E32.

## 3. Publicar el servicio
1. Botón azul **Implementar → Nueva implementación**.
2. Engrane → tipo **Aplicación web**.
3. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**. → Implementar.
4. Copiar la **URL de la aplicación web** (termina en `/exec`).

## 4. Conectar la página
En `pago.html`, al principio del `<script>`, pegar esa URL en `SCRIPT_URL` y subir el sitio.

## 5. Probar
Abrir `pago.html`, tocar **Depto 14**, poner $1,500 en mantenimiento, agregar cualquier captura, enviar.
Debe aparecer un renglón en **Pagos** con estatus *Pendiente* y la captura en la carpeta del mes.
Cambiar el estatus a **Confirmado**: la fecha se anota sola y en la página el pago cambia de color.

## Después
- **Qué pasa con cada reporte:** el vecino elige el mes. El script suma el monto en la pestaña de ese mes
  (Cobros por departamento, o el registro de casa club) y pinta la celda de **amarillo**. En Pagos queda el
  renglón con la captura y estatus *Pendiente*.
- **Confirmar un pago:** en Pagos, columna *Estatus* → **Confirmado**. La celda del mes recupera su color y
  se anota la fecha. **Rechazado** retira el monto de la celda del mes. Si lo regresas a *Pendiente*, vuelve
  a amarillo. Las celdas en amarillo son lo que aún no has cotejado en el banco.
- **Si cambias algo a mano en la pestaña del mes**, el script no se entera; lo que gobierna el amarillo es el
  estatus en Pagos.
- **Cambiar la cuota, el extraordinario vigente o poner un aviso:** pestaña Config, columna Valor.
- **Adeudos anteriores:** la página dice "pendiente" para todos hasta que en Config exista el renglón
  `adeudos` con el valor `mostrar` (si no está el renglón, agrégalo en la columna A y escribe `mostrar` en la B).
  Entonces muestra lo que diga "Adeudos (hoja maestra)" para cada departamento.
- **Si cambias el script:** Implementar → Administrar implementaciones → lápiz → Versión: *Nueva* → Implementar.
  La URL no cambia.
