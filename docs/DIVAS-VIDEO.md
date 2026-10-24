# Divas Video · v41

Editor de vídeo integrado en Divas Agency. Los flyers y la biblioteca privada de documentos conservan su funcionamiento. Esta actualización no requiere SQL ni cambios en Supabase.

## Quitar el fondo de un vídeo

1. Añade un vídeo con **Fotos / clips**, o usa **Capa** para colocarlo sobre otro fondo o vídeo.
2. Selecciona ese clip y pulsa el botón rosa **Quitar fondo**, visible sobre el lienzo en PC y móvil.
3. **Elegir color** muestra el fotograma original. Toca el color del fondo con el dedo, lápiz o ratón. **Automático** busca un color uniforme predominante en los bordes. Si no encuentra uno suficientemente consistente, pide usar el cuentagotas.
4. Ajusta **Intensidad**, **Suavizar bordes** y **Limpiar reflejo del color**. Los botones verde, azul, blanco y negro son accesos directos. Se puede introducir otro color.
5. Compara con **Ver antes** o usa **Ver recorte** para ver la transparencia sobre una cuadrícula. **Restablecer fondo** recupera el original.
6. Coloca otra capa debajo o elige el color de fondo en Audio → Salida. La exportación conserva el recorte y las capas.

El recorte es por color, no segmentación de personas mediante IA. Un fondo complejo y un sujeto con el mismo color requieren otro tipo de recorte. El archivo original no cambia. La cuadrícula es una ayuda de vista previa: la exportación actual genera el vídeo compuesto sobre su fondo, sin canal alfa independiente.

## Capas y línea de tiempo

- **Fotos / clips** añade escenas consecutivas a la pista base.
- **Capa** añade imágenes o vídeos superpuestos con su propia hora de inicio y duración. **T Texto** añade un texto independiente.
- Arrastra una capa en la línea de tiempo para moverla; arrastra sus extremos para recortarla. En **Tiempo** también hay campos numéricos, dividir, duplicar y eliminar. En las escenas, las flechas cambian el orden temporal; en las capas cambian el orden visual (izquierda detrás, derecha delante).
- Arrastra sobre el lienzo para mover una capa. Sus esquinas cambian el tamaño manteniendo la proporción. **Mover** incluye encuadre, giro, opacidad, posición y máscaras circulares o con esquinas redondeadas.
- El candado bloquea las modificaciones; el botón × elimina la selección. El ojo oculta la capa. **Vista limpia** permite revisar sin el marco de selección.
- **Deshacer / Rehacer**, también Ctrl Z y Ctrl Shift Z fuera de campos de texto, recupera los cambios y los archivos de las capas eliminadas mientras permanezcan en el historial.
- En móvil, **Lienzo** cierra los controles; **Editar capa** los recupera. **Capas** despliega o pliega las pistas. Los controles de fondo, texto y movimiento pliegan las pistas para dar espacio al vídeo.

## Animación, texto y sonido

- **Animar flyer** captura el flyer abierto y crea una escena de siete segundos con acercamiento y fundido. Esa captura es una imagen; las capas originales siguen editables en el editor de flyers.
- **Animar de inicio a final** interpola posición, tamaño, giro y opacidad. **Editar inicio / Editar final** permite establecer ambos estados. En el modo Editar final se muestra la pose final sin el fundido para poder ajustarla; la exportación conserva la transición elegida.
- Los textos tienen estilos Dorado Divas, Glow, Neón, fondo oscuro y limpio; cuatro familias tipográficas, color, tamaño y entrada suave, desde abajo o con zoom. El brillo se dibuja detrás de un frente nítido. Los textos se ajustan a varias líneas.
- Se puede ajustar luz, contraste y saturación por capa. Los ajustes no modifican el archivo original.
- Se conservan los audios de los clips, una música de fondo con recorte y repetición, y hasta cuatro pistas independientes para voces y efectos. Cada clip o pista tiene volumen y entradas/salidas suaves.

## Guardado, compatibilidad y traslado

Los proyectos y sus archivos se guardan automáticamente en IndexedDB, **en este navegador y dispositivo**, separados por cuenta. **Guardar** confirma el estado. **Mis proyectos**, en el inicio, reúne los vídeos y los diseños. Usa los filtros **Todos / Diseños / Vídeos**, busca por nombre o cambia el orden. Las tarjetas de vídeo muestran su duración, abren el vídeo correspondiente y permiten descargar su respaldo o eliminarlo desde el menú •••. El botón **Mis proyectos** de Video regresa a esa misma lista. **Crear video** empieza un proyecto nuevo; no reemplaza el anterior. Los vídeos guardados antes de v41 aparecen automáticamente en la misma cuenta y navegador. No se suben vídeos a Supabase.

**Respaldo** descarga un `.divasvideo` con clips, imágenes, audio, capas, efectos y animaciones. **Abrir respaldo** crea una copia nueva. Los respaldos v39 se migran al abrirlos con el fondo intacto y sin añadir opacidad. v39 no puede abrir un proyecto creado con el formato v40.

Los conflictos entre dos pestañas no sobrescriben el otro proyecto; aparece **Guardar copia**. El historial mantiene hasta 35 estados, con límite adicional de memoria para archivos anteriores. No se guarda como historial de versiones después de cerrar el navegador. El almacenamiento local puede borrarse o llenarse; conserva respaldos de lo importante.

## Exportación y límites

- Formatos 9:16, 1:1 y 16:9. HD 720p o Full HD 1080p, 30 fps.
- MP4 (H.264/AAC) cuando el navegador puede codificarlo; WebM (VP8/Opus) como alternativa. El formato disponible se indica sobre el lienzo.
- 30 escenas, 12 capas visuales adicionales, 4 pistas de audio y hasta 4 clips de vídeo simultáneos. Duración total máxima: 3 minutos.
- Máximo 150 MB de recursos usados por proyecto: foto 20 MB, clip 80 MB, audio 30 MB.
- Imágenes PNG/JPG/WebP; MP4/WebM/MOV y audio cuando el navegador puede decodificarlos.
- Vista previa y exportación comparten el renderizador de recorte, máscaras, color, composición y texto. La salida usa tiempos fijos, no una grabación de la pantalla. WebGL acelera los efectos y existe una alternativa por píxeles si no está disponible.
- No incluye generación con IA, subtítulos automáticos, seguimiento de personas ni exportación de transparencia. Full HD y varias capas pueden tardar más en equipos modestos.

## Publicación

`npx wrangler deploy` usa `scripts/build-static.mjs` para generar el paquete completo. El nuevo `assets/divas-video-render.mjs` es obligatorio y está incluido en la verificación de empaquetado. No reemplaces solo el HTML.

Se utiliza Mediabunny 1.62.0, incluido con su licencia MPL-2.0 y referencias al código fuente. El editor y sus efectos no usan código ni servicios de CapCut.

Consulta `tests/README-video.md` para reproducir las comprobaciones. Las pruebas usan archivos sintéticos y Supabase simulado; no alteran cuentas ni datos reales.
