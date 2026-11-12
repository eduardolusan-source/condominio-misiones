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

## Bandeja de confirmación (privada)
`bandeja.html` no aparece en el menú. Pide la clave que está en `CLAVE_ADMIN` dentro de `Code.gs`
(**cámbiala antes de publicar**; la que viene es de ejemplo). Muestra solo los pagos pendientes, cada uno con
su captura, y dos botones: Confirmar y Rechazar. Hacen exactamente lo mismo que cambiar el estatus en Pagos.
La clave se guarda en el celular para no pedirla cada vez; "Salir" la borra.

## Después
- **Los reportes nuevos entran arriba** de la pestaña Pagos, y el encabezado tiene filtro: con el embudo de
  la columna Estatus puedes ver solo los Pendiente. Cada pago tiene un folio fijo (columna Folio).
- **Varios meses de un jalón:** el vecino puede marcar varios meses ("Otro mes…" muestra todos desde julio
  de 2026). El mantenimiento se repite por mes; agua, extraordinario y casa club van al mes más reciente.
  Entra un renglón en Pagos por cada mes, con la misma captura, y cada uno se confirma por separado.
- **Años siguientes:** las pestañas de 2026 se llaman "Octubre"; desde 2027 el script las crea como
  "Enero 2027", así alguien puede pagar diciembre de 2026 en enero sin confundir años.
- **Qué pasa con cada reporte:** el vecino elige el mes. El script suma el monto en la pestaña de ese mes
  (Cobros por departamento, o el registro de casa club) y pinta la celda de **amarillo**. En Pagos queda el
  renglón con la captura y estatus *Pendiente*.
- **Confirmar un pago:** en Pagos, columna *Estatus* → **Confirmado**. La celda del mes recupera su color y
  se anota la fecha. **Rechazado** retira el monto de la celda del mes y el vecino lo ve en la página como
  **«no se encontró»**, con la explicación de que la mesa no lo ubicó en el banco. Si lo regresas a
  *Pendiente* o a *Confirmado*, el monto vuelve a la pestaña del mes (la columna oculta M lo recuerda con el
  prefijo `retirado|`). Las celdas en amarillo son lo que aún no has cotejado en el banco; si dos reportes
  tocan la misma celda, sigue amarilla hasta que los dos estén resueltos.
- **Pruebas y reportes repetidos:** un renglón rechazado se queda a la vista del vecino. Para que desaparezca
  de la página, bórralo de la pestaña Pagos (un rechazado ya no toca la pestaña del mes). Los tres reportes de
  prueba del depto 14 del 6 de octubre de 2026 (septiembre, octubre y noviembre, $1,500 cada uno, rechazados)
  se pueden borrar.
- **Dos personas de la mesa a la vez:** si alguien ya confirmó o rechazó un pago, la bandeja de la otra avisa
  "ya lo resolvió alguien más" y recarga; un doble toque no aplica el pago dos veces.
- **Si la pestaña del mes no tiene el renglón "Depto N"** (o el registro de casa club), el reporte entra igual
  en Pagos con la nota "⚠ No quedó anotado en la pestaña de …": anótalo a mano al confirmar.
- **Si cambias algo a mano en la pestaña del mes**, el script no se entera; lo que gobierna el amarillo es el
  estatus en Pagos.
- **Cambiar la cuota, el extraordinario vigente o poner un aviso:** pestaña Config, columna Valor.
- **Adeudos anteriores:** la página dice "pendiente" para todos hasta que en Config exista el renglón
  `adeudos` con el valor `mostrar` (si no está el renglón, agrégalo en la columna A y escribe `mostrar` en la B).
  Entonces muestra lo que diga "Adeudos (hoja maestra)" para cada departamento.
- **Si cambias el script:** Implementar → Administrar implementaciones → lápiz → Versión: *Nueva* → Implementar.
  La URL no cambia.

## 6. Actualizar el script cuando cambie `Code.gs` (por ejemplo, para `cuentas.html`)
**Ojo con `CLAVE_ADMIN`:** en el editor tiene la clave real de la bandeja; el repo trae `"cambia-esta-clave"`.
Al pegar un `Code.gs` nuevo, conserva la línea `const CLAVE_ADMIN = …` que ya estaba en el editor.
La dirección `/exec` no cambia si editas la implementación existente:
1. **Extensiones → Apps Script**, pegar el `Code.gs` nuevo completo y guardar.
2. **Implementar → Administrar implementaciones** → lápiz de la implementación activa →
   Versión: **Nueva versión** → **Implementar**.
3. Probar en `cuentas.html`: tocar un depto; debe aparecer su adeudo al corte y los
   renglones de julio a septiembre. Al enviar, nace la pestaña **Validaciones** y la
   subcarpeta **Validaciones** dentro de "Misiones · Comprobantes".

`cuentas.html` no toca Pagos ni las pestañas de los meses: solo registra qué dice cada
depto de su adeudo (lo debe, lo pagó a la administración anterior, no es correcto), cuánto
dice haber pagado y sus comprobantes. Con eso se arma la hoja de cuentas y se calcula lo
que debe la administración anterior.

## 7. Agua: lecturas, recibo y cargos
Tras pegar el `Code.gs` nuevo y publicar nueva versión (paso 6):
- **`lecturas.html`** es para quien lee los medidores. Pide la clave `clave_lector` de Config
  (nace sola con el valor `agua` la primera vez que se abre la página; cámbiala). Un depto a la
  vez: foto, número negro del medidor y Guardar. La primera vez pide también la lectura anterior.
  Las fotos caen en "Misiones · Comprobantes / Agua AAAA-MM".
- La pestaña **Agua** se crea sola: una fila por depto y mes con lectura anterior, actual,
  consumo, foto, cargo (fórmula) y **Pagado el**.
- El recibo de la CEA lo captura la misma persona en el primer bloque de `lecturas.html`:
  monto, m³ (impresos en el recibo), fecha límite y foto. Cae en la pestaña **Recibos agua**
  (una fila por mes; B, C y D también se pueden corregir a mano). Las demás columnas se
  calculan: precio por m³, suma de lecturas, m³ comunes y comunes por depto. Con eso el cargo
  de cada depto aparece en Agua y en `agua.html` sin que nadie más haga nada.
- **Pagado**: se marca solo cuando se confirma en Pagos (bandeja o columna J) un pago de ese
  depto con agua y ese mes; o a mano escribiendo la fecha en Agua → columna J.
- `dia_lectura` en Config: día del mes en que se leen los medidores (por definir).

## 8. Asamblea: votación en vivo y acuerdos
La pestaña **Sesión** de `asamblea.html` tiene la presentación (botón de pantalla completa), la
votación por departamento y los acuerdos.
- **Votos**: la mesa directiva los registra al momento con "Abrir el tablero de votos" (sin
  clave: se usa en la junta a la vista de todos): elige la opción y toca los deptos que la votaron. Caen en la pestaña **Votos** (una fila por
  depto y pregunta). Todos ven el conteo, refrescado cada 8 segundos.
- **Acuerdos**: el botón "Llenar acuerdos" guarda sin clave en la pestaña **Acuerdos** (tema, acuerdo, responsable, fecha). `acuerdos.html` arma el documento con
  los resultados y los acuerdos, listo para guardar como PDF.
- **Reparto de responsabilidades**: en la misma pestaña, un campo "Quién" por tarea que se guarda
  al momento (pestaña **Tareas**) y un formulario para sumar tareas extra. Lo anotado se refleja en
  la tabla del tema 2 y en `acuerdos.html`.
- Las preguntas están en el código de `asamblea.html` y `acuerdos.html` (lista `PREGUNTAS`); para
  otra asamblea se cambian ahí.

## Finanzas en vivo y registro de egresos (19 de octubre de 2026)

**Qué cambia al volver a correr `instalar`** (Ejecutar → instalar, y luego publicar
la nueva versión del script: Implementar → Administrar implementaciones → lápiz →
Versión: Nueva versión → Implementar; la URL no cambia):

- Config gana `clave_egresos` (nace como `egresos`; cámbiala ahí mismo) y
  `finanzas_desde` (`2026-10`: desde qué mes finanzas.html lee esta hoja).
- Nace la pestaña **Egresos**, bitácora de cada gasto registrado desde la página.
- En la plantilla y en los meses en vivo sin cobros se borran los 7,000 de
  Administración y 7,000 de Limpieza que venían de ejemplo. Julio, agosto y
  septiembre no se tocan (tienen cobros de la administración anterior): si esos
  14,000 no son reales, bórralos a mano.
- El saldo inicial de cada mes en vivo queda encadenado al saldo final del mes
  anterior (noviembre toma el cierre de octubre, etc.). Octubre arranca en lo
  que diga su celda C6.
- El registro de casa club gana título y encabezados claros (Depto que rentó ·
  Fecha del evento · Monto cobrado) y, si algún monto quedó en la columna Depto,
  pasa a Monto; si ese monto estaba además como "extraordinario" de un depto en
  cobros, se quita de ahí y el depto queda anotado en el registro.

**finanzas.html** pide `accion=finanzas` al script y mezcla lo que responde con
`js/data.js`: 2025 y enero–junio de 2026 siguen saliendo del archivo; desde
`finanzas_desde` salen de la hoja. Un mes aparece en cuanto su pestaña tiene
cobros o gastos. La respuesta se guarda cinco minutos (`?fresh=1` la fuerza) y
se limpia sola al registrar un egreso.

**egresos.html** (sin enlace en el menú; liga desde la bandeja) pide la clave de
`clave_egresos` y el nombre de quien registra. Por gasto: mes, tipo (ordinario o
extraordinario), concepto, a quién se pagó, monto por pago, fechas en un
calendario del mes, nota y foto o PDF del comprobante. Para el conserje de
lunes, miércoles y viernes: botón **L · M · V**, quitar los días que no vino y
monto 600; entra una suma al renglón "Limpieza y conserjería" del mes y una
fila por día en la bitácora. En la pestaña del mes, los ordinarios se suman al
renglón de su concepto y los extraordinarios ocupan renglón propio (si no hay
libre, se inserta dentro de la suma). El comprobante va a la carpeta del mes en
Drive y su liga a la columna D del renglón. "Quitar" en la lista resta el monto
de la celda (o limpia el renglón si lo creó) y marca Anulado en la bitácora.

## Lecturas de agua (19 de octubre de 2026)

- La **lectura anterior es fija**: la última guardada de un mes previo (con su fecha). No se edita desde la página. Si un depto no tiene ninguna, la primera lectura que se guarde queda como **línea base** (consumo 0, nota "Línea de base del …" en la pestaña Agua).
- El bloque del recibo muestra el **recibo anterior** (así quedó) como referencia y el del mes en blanco; si el del mes ya está guardado, aparece resumido con botón **Corregir**. Cada recibo va en el mes en que llega.
- Una lectura guardada queda bloqueada; **Corregir** la abre de nuevo. Arriba, "Faltan: 1, 5…" lleva directo a cada depto pendiente.
- `lineasBaseOctubre2026()` cargó las bases que recabó Eduardo (1: 90, 2: 114, 5: 87, 6: 90, 10: 131, 13: 14; 9 corregido de 139 a 127). Es de una sola vez e idempotente.

## Rechazos reversibles y etiqueta «no se encontró» (4 de noviembre de 2026)
Pegar el `Code.gs` nuevo y publicar nueva versión (paso 6). No hace falta correr `instalar`.
- La página decía **REVISAR** en los pagos con estatus *Rechazado* (palabra que no existe en la hoja);
  ahora dice **no se encontró** y explica qué hacer.
- *Rechazado* ya no borra la columna M: el monto se repone al regresar el renglón a *Pendiente* o *Confirmado*,
  y rechazar dos veces no resta dos veces.
- El color original de la celda del mes se guarda bien aunque ya estuviera amarilla por otro reporte, y la
  celda sigue amarilla mientras quede algún reporte pendiente que la toque.
- La bandeja no resuelve dos veces el mismo pago ni pisa lo que otra persona de la mesa ya resolvió.
- Si un reporte no encuentra su celda en la pestaña del mes, lo dice en la nota del renglón de Pagos.

## Agua: áreas comunes, medidor general y tinaco (9 de noviembre de 2026)
**Publicado el 9 de noviembre de 2026 como versión 17** de la misma implementación (la URL `/exec` no cambió),
conservando la `CLAVE_ADMIN` del editor. La primera consulta puso al día las pestañas de agua; para volver a
correrlo a mano: `actualizarAgua()`.
- **Por qué:** la CEA cobra con un mes de atraso (el recibo de octubre de 2026 cobró del 6 de agosto al 4 de
  septiembre), así que los m³ del recibo casi nunca son de los mismos días que nuestras lecturas. En noviembre
  los 16 sumaron 48 m³ contra 41 del recibo: las áreas comunes salían negativas y los deptos vacíos (3 y 16)
  quedaban en $0.
- **Mínimo de áreas comunes:** Config `comunes_min_m3` (nace en 5). Cada recibo lo copia a su columna J de
  Recibos agua al crearse; para un mes en particular se cambia ahí. Las áreas comunes nunca bajan de ese mínimo
  y las pagan los 16 por igual, aunque el depto esté vacío.
- **Ajuste proporcional:** si los 16 más el mínimo no caben en el tinaco, cada lectura cuenta al mismo
  porcentaje (columna M): al que más gastó se le quitan más m³. El cargo de cada depto es
  m³ × precio por m³ medido (redondeado) + áreas comunes (redondeadas), para que el ticket se compruebe con
  calculadora; por eso los 16 suman el recibo con diferencia de centavos.
- **Medidor general (CEA, no. 25306677):** primera tarjeta de `lecturas.html`. En la pestaña Agua va con
  Depto = `General`: no paga y no entra en la suma de los 16. Su primera lectura es la línea base; desde el
  mes siguiente, lo que marque es el tamaño del tinaco en lugar de los m³ del recibo, y las áreas comunes
  salen medidas (tinaco − suma de los 16). Conviene leerlo el mismo día que los deptos.
- **Recibos agua, columnas nuevas:** J mínimo de áreas comunes (azul, se captura), K m³ del medidor general,
  L m³ del tinaco (K si hay, si no C), M ajuste de lecturas, N precio por m³ medido. E ahora es B ÷ L;
  G = mín(L, máx(L − F, J)); H = E × G ÷ 16. Cargo en Agua (columna I) = ROUND(consumo × ROUND(N, 2), 2) + ROUND(H, 2).
- **Páginas:** `lecturas.html` trae una barrita fija y la tarjeta «Tinaco del mes», que se llena con cada
  lectura guardada (le cae una gota), marca la franja del mínimo de áreas comunes y avisa en naranja si se
  desborda. `agua.html` es un ticket por depto (los números del medidor, una gota por m³, litros y garrafones,
  tu agua, áreas comunes con su monto total —5 m³ = $1,265.12 entre los 16—, total y sello de PAGADO /
  POR PAGAR) más el tinaco del edificio con su capa resaltada, sin textos de explicación; `agua.html?depto=9`
  abre directo el 9. El ticket se titula con el mes del agua, no el de la lectura: la lectura del 9 de
  noviembre es el «Agua de octubre». Solo salen los meses cobrados con lecturas (la primera lectura de cada
  medidor no se muestra), y los anteriores aparecen abajo conforme se acumulan. Las dos usan `js/tinaco.js` y
  funcionan también con el script anterior mientras se publica el nuevo.
- **Probado** con las fórmulas reales calculadas en LibreOffice sobre la hoja exportada: noviembre con 5 m³ deja
  a los deptos 3 y 16 en $79.07, al 9 en $2,166.54 (11 × $189.77 + $79.07) y el edificio junta $10,374.08;
  octubre no cambia (16 × $670.13).

## Finanzas: morosidad en vivo y tablero nuevo (12 de noviembre de 2026)
Pegar el `Code.gs` nuevo **conservando la línea `const CLAVE_ADMIN = …` que ya está en el editor** y
publicar nueva versión (paso 6). No hace falta correr `instalar`. Mientras no se publique, la página sigue
funcionando: muestra la morosidad de la foto del 22 de junio de 2026.
- `accion=finanzas` trae también `aguaCobro`: por mes del agua, deptos con cargo, cuántos pagaron, cuántos faltan y
  el monto por cobrar (sumas de la pestaña Agua).
- `accion=finanzas` ahora trae, en cada mes en vivo, `mora`: **acumulada** (cuotas de mantenimiento sin
  pagar desde `finanzas_desde`, sumadas), **unidades** con saldo en contra, **adelantos** (pagos de meses
  futuros, sumados) y **unidadesAdelanto**. Se calcula depto por depto con la columna de mantenimiento de
  "Cobros por departamento" y la cuota de Config (`cuota_mantenimiento`); solo salen sumas y conteos.
- Lo anterior a `finanzas_desde` (la administración anterior) no entra en esa cuenta: su morosidad sigue
  siendo la foto agregada de `js/data.js`. La página lo dice así.
- `finanzas.html` cambió de cara: abre con seis indicadores y desde ahí se entra a cada sección
  (mes por mes, gráficas, en qué se gasta, morosidad, agua, proyectos, revisión). Los datos son los mismos.

## Reporte mensual a los vecinos (PDF + correo + kit de WhatsApp)
`Reporte.gs` es un **segundo archivo** del mismo proyecto de Apps Script (usa `finanzas_()` y `config_()` de
`Code.gs`). Requiere que `Code.gs` ya tenga la morosidad en vivo (sección anterior).
1. En el editor: **+ → Secuencia de comandos**, nombre `Reporte`, pegar `apps-script/Reporte.gs` y guardar.
2. Ejecutar **instalarReporte** una vez y aceptar los permisos nuevos (enviar correo como tú, crear archivos en
   Drive, disparadores). Crea la pestaña **Correos** (Depto · Nombre · Correo · Recibe sí/no), la pestaña
   **Reportes** (bitácora), las claves de Config `reporte_envio` (`automático` o `pausa`) y `reporte_copia`
   (tu correo), y el disparador del **día 10 a las 9** (hora de Querétaro).
3. Publicar nueva versión de la implementación (paso 6) no hace falta para el reporte, pero sí para la
   morosidad en vivo.
4. Al abrir la hoja aparece el menú **Condominio**: «Probar el reporte (solo a mí)» manda el último mes
   capturado únicamente a `reporte_copia`. Úsalo antes del primer día 10.

Qué pasa el día 10, con el mes anterior:
- Arma el **PDF** (una hoja: saldo, entró/salió, quién pagó, cuotas atrasadas, agua, en qué se fue la cuota y
  los gastos del mes) y lo guarda en Drive → «Misiones · Reportes / AAAA-MM».
- Lo **envía** a los correos de la pestaña Correos en **copia oculta** (nadie ve el correo de los demás; se
  omiten los marcados «no», los repetidos y los mal escritos), con un resumen en el cuerpo y liga al sitio.
- Te manda el **kit de WhatsApp**: el texto, un botón que abre WhatsApp con el mensaje escrito y dos botones a
  las **infografías** (`infografia.html?tipo=cuotas`, `?tipo=agua` y `?tipo=aguadeuda`), que se comparten como
  imagen con un toque. Cuotas: edificio de noche, calle de casitas, alcancía, buzones y balcón con macetas.
  ¿Alcanzó para el agua?: tinaco, gotas y vaso. Agua por pagar (deptos con su recibo pendiente, según la columna
  «Pagado el» de la pestaña Agua; solo el conteo y el monto total): garrafones y llaves. El estilo rota cada mes;
  en la página se puede elegir otro. Ventanas, casas, buzones, macetas, monedas, garrafones y llaves se acomodan
  al azar cada mes: no son deptos reales.
- El correo a los vecinos es el formal (PDF y resumen en tabla); lo visual es para WhatsApp.
- **Candados:** si el mes no tiene datos no se envía nada a los vecinos y te avisa; un mes se envía una sola vez;
  con `reporte_envio = pausa` solo te llega el kit. Todo queda en la pestaña Reportes.
- WhatsApp no permite publicar en grupos automáticamente sin la API de pago de WhatsApp Business; por eso el
  último paso (elegir el grupo y enviar) lo haces tú.

## Meses futuros, etiquetas de periodo y avance del mes (12 de noviembre de 2026)
Pegar `Code.gs` (conservando `CLAVE_ADMIN`) y `Reporte.gs` nuevos y publicar nueva versión (paso 6).
- Si alguien paga un mes futuro (p. ej. diciembre estando en noviembre), ese mes **no se publica** ni cobra
  cuota a nadie en la morosidad: su pago cuenta como adelanto del mes en curso. `accion=finanzas` trae `hoy`,
  `pagosFuturos` y en cada mes `enCurso` y `esperado` (cuotas × unidades).
- «Probar (solo a mí)» usa el mes anterior ya cerrado, igual que el envío del día 10.
- Cada infografía dice arriba su periodo: «Cierre de octubre 2026», «Avance al 12 de noviembre · mes en curso»
  o «Recibo del agua de octubre · al 12 de noviembre». Nuevo tipo `?tipo=avance` (barras con el calendario del
  mes, o edificio y tinaco que se llenan; animadas en pantalla, la imagen sale quieta) y su botón en el kit.
- En el tablero, el mes en curso se marca «en curso» y sus cifras se leen como avance, no como cierre.

## Cambio de año (12 de noviembre de 2026)
- La morosidad en vivo cuenta desde `finanzas_desde` sin reiniciarse en enero.
- Cuando el script crea la pestaña de un mes (al reportarse un pago, un egreso, o el día 10 con
  `prepararMesSiguiente`), su saldo inicial queda **encadenado** al saldo final del mes anterior, también de
  diciembre a **Enero 2027**. Menú: «Condominio → Preparar la pestaña del mes siguiente».
- Pendiente para dentro de unos años: archivar años viejos (como en La Valetta) cuando la hoja crezca.

## Menú «Condominio», semáforo y claves en Config (12 de noviembre de 2026)
Tres archivos en el editor: `Code`, `Reporte` y **`Condominio`** (sustituye a `Revision`).

1. **Antes de pegar nada:** abre `Code.gs` en el editor y copia la clave de la línea
   `const CLAVE_ADMIN = "…"`. En la pestaña **Config** agrega un renglón: `clave_admin` · *tu clave*.
   (Si se te olvida, no pasa nada grave: el script la pasa sola a Config la primera vez, siempre que tu
   clave no sea la de ejemplo; y desde el menú puedes poner una nueva.)
2. Pega `Code.gs` y `Reporte.gs` nuevos (reemplaza todo el contenido de cada uno).
3. Si existe el archivo `Revision`: ⋮ → **Eliminar**. Luego **+ → Secuencia de comandos** → nombre
   `Condominio` → pega `Condominio.gs`.
4. Guarda y publica: **Implementar → Administrar implementaciones → lápiz → Nueva versión → Implementar.**
5. Recarga la hoja: el menú ahora se llama **Condominio**. Prueba **Revisar que todo cuadre**.

Qué cambia:
- **Semáforo** (menú y kit del día 10): texto en celdas de monto, cobros de más de 3 cuotas, saldos que no
  encadenan, pestañas duplicadas o copiadas, mes anterior sin capturar, gastos de ejemplo, lecturas de agua
  faltantes o menores que la anterior, consumos de más del triple del promedio, recibo de la CEA sin capturar,
  pagos con más de una semana en la bandeja, claves de ejemplo y pestaña Correos vacía. Es privado.
- **Clave de la bandeja en Config** (`clave_admin`), igual que `clave_egresos` y `clave_lector`. Pegar
  versiones nuevas ya no la borra. Cambiarla: menú Condominio → Cambiar la clave de la bandeja de pagos…
- **Sitio:** páginas `ayuda.html`, `privacidad.html` (aviso de privacidad) y `guia-mesa.html` (rutina mensual
  con pantallas dibujadas); «Ayuda» en el menú del sitio.

## Registro de correos desde el sitio (12 de noviembre de 2026)
Página nueva `correo.html` («Recibe el reporte por correo»): cada vecino elige su departamento, escribe su
correo (y su nombre, opcional) y acepta el aviso de privacidad. Cae solo en la pestaña **Correos** con «sí» y le
llega un correo de confirmación. En la misma página puede darse de baja (queda «no»). Un correo repetido se
actualiza, no se duplica; varios correos por departamento están permitidos. Candados: formato, campo trampa
contra robots y máximo 3 intentos por correo y 40 por hora. El semáforo dice cuántos departamentos ya tienen
correo y cuáles faltan.

Para activarlo: pega `Code.gs` y `Condominio.gs` nuevos → Implementar → Administrar implementaciones → lápiz →
Nueva versión. La primera vez Google puede pedir de nuevo el permiso de enviar correo.
