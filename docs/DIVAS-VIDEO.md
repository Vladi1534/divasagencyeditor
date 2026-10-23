# Divas Video · primera integración (v39)

Esta actualización añade edición de video dentro del editor Divas Agency. Esta entrega integra Video junto a la versión 38 «Manuales → flyers», conservando su biblioteca privada, su migración SQL y sus pruebas.

## Uso

1. Abre **Crear video** en Mis proyectos, **Video** en el editor o **Divas Video** en el menú.
2. Pulsa **Flyer abierto** para incorporar el diseño actual, o **Fotos / clips** para añadir archivos.
3. Selecciona una escena. Ajusta duración, inicio/final, encuadre, movimiento, fundido y texto. Las flechas cambian su orden; **Dividir en el cabezal** corta la escena en la posición elegida.
4. En móvil, **Escena y texto** abre sus controles; **Música y salida** permite elegir música y calidad. **Vista previa** devuelve espacio al video.
5. Exporta. El formato disponible aparece junto a las dimensiones: MP4 (H.264/AAC) cuando el navegador puede codificarlo; WebM (VP8/Opus) en caso contrario. El archivo se genera a 30 fps con tiempos fijos, independientemente de la velocidad de la vista previa.

El flyer se incorpora como una imagen de su composición. Sus capas siguen editables en el editor original; si lo cambias, añade su versión nueva al video. El texto añadido sobre una escena sí se edita dentro de Video.

## Guardado y traslado

- Los videos y sus archivos se guardan automáticamente en IndexedDB, **en este navegador y dispositivo**, separados por cuenta. El estado confirma cuándo terminó la escritura. **Mis videos** permite reabrirlos.
- No se suben videos a Supabase ni se modifica el guardado de flyers.
- **Respaldo** descarga un `.divasvideo` con el proyecto, las fotos, los clips y la música. **Abrir respaldo** lo recupera como una copia nueva, incluso en otro dispositivo.
- Un conflicto entre dos pestañas no sobrescribe la otra versión. **Guardar** muestra la opción **Guardar copia**.
- El almacenamiento del navegador puede borrarse o quedarse sin espacio. Conserva un respaldo de los videos importantes.

## Alcance

- Fotos PNG, JPG y WebP; clips MP4, WebM y MOV si el navegador los puede leer; música compatible con el navegador.
- Tres formatos: 9:16, 1:1 y 16:9. Salida HD (720p) o Full HD (1080p).
- Hasta 30 escenas, 3 minutos y 150 MB de recursos por proyecto. Por archivo: foto 20 MB, video 80 MB y audio 30 MB.
- Un mensaje por escena, con posición, tamaño, color, fondo o brillo y entrada suave; acercamiento o desplazamiento de la imagen; fundido al fondo o corte directo.
- Una pista de música, con volumen, inicio y repetición, mezclada con el audio recortado de los clips.
- Esta entrega todavía no incluye varias pistas visuales simultáneas, edición de capas del flyer en la línea de tiempo, subtítulos automáticos, eliminación de fondos de video ni generación con IA.
- La exportación necesita WebCodecs y los codificadores correspondientes. Un navegador sin ellos puede editar y descargar el respaldo para exportar en uno compatible. Full HD puede tardar más en equipos modestos.

## Publicación y mantenimiento

Publica `index.html` junto con la carpeta `assets` que acompaña esta actualización. No basta con reemplazar el HTML. Conserva los otros archivos existentes del repositorio. No se requiere SQL ni cambiar permisos de Supabase.

Los módulos se cargan al final de la página. El exportador y Mediabunny 1.62.0 se descargan al abrir Video. La biblioteca está incluida en `assets/vendor/mediabunny`, con su licencia MPL-2.0 y referencia al código fuente. No se depende de un CDN para exportar y no se utiliza código de Concat.

## Validación realizada

- Carga mixta de foto, clip con sonido y música; recorte, división, cambio de orden, duplicación y eliminación.
- Guardado de los archivos reales, recarga de la página y reapertura; respaldo portátil y recuperación.
- Captura de un flyer abierto usando el renderizador real; el lienzo del editor conserva exactamente sus píxeles.
- Conflicto de edición en dos pestañas y recuperación como copia; separación local por cuenta y limpieza al cambiar de identidad.
- Exportación WebM de 5 segundos verificada con FFprobe: 150 fotogramas, 30 fps, 720 × 1280, pista Opus y duración de 5,02 s por el relleno del códec de audio. Se verificó la presencia de la música y del sonido del clip en sus posiciones previstas.
- Cancelación de exportación, archivos inválidos y límites del proyecto.
- Interfaz de escritorio y vistas de 390 y 360 px sin desbordamiento horizontal.

La codificación MP4 depende del navegador y no estuvo disponible en el Chromium de prueba; se validó la alternativa WebM. Las pruebas usaron archivos sintéticos y cuentas locales simuladas, sin modificar usuarios, proyectos o recursos reales de Supabase. No sustituyen una prueba en el teléfono físico.

Pruebas: `node tests/video-model.cjs`. Las pruebas de navegador necesitan Playwright, un Chromium local y los fixtures descritos en `tests/README-video.md`.
