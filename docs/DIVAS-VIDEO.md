# Divas Video · v42

Editor de vídeo integrado en Divas Agency. Los flyers y la biblioteca privada de documentos conservan su funcionamiento. Esta actualización no requiere SQL ni cambios en Supabase.

## Quitar el fondo de un vídeo

1. Añade un vídeo con **Fotos / clips**, o usa **Capa** para añadir otro elemento.
2. Comprueba el selector **Editando**, siempre visible encima del lienzo. Elige el vídeo o la imagen que tiene el fondo que quieres quitar. Si no aparece en ese momento, **Ver esta capa** lleva a un fotograma donde existe; **Quitar fondo** también hace ese ajuste.
3. Pulsa **Quitar fondo**. **Elegir color** muestra el original: toca el fondo con el dedo, lápiz o ratón. También puedes pulsar **Blanco**, **Verde**, **Azul** o **Negro**. **Automático** busca un color uniforme en los bordes; si no lo encuentra, solicita el cuentagotas.
4. Revisa **Antes / Después** o **Comparar**, con un deslizador para mover la división. **Transparencia** aísla el elemento sobre una cuadrícula. La cifra de comprobación estima cuánto alfa se elimina en un fotograma reducido; si es casi cero, avisa que debes revisar el color y el elemento seleccionado.
5. Ajusta **Intensidad**, **Suavizar bordes** y **Limpiar reflejo del color** si hace falta. Hasta pulsar **Confirmar recorte**, el efecto es una vista previa sin guardar. **Cancelar** conserva el recorte anterior. La confirmación puede deshacerse en un paso. **Listo** vuelve a las herramientas habituales. **Restablecer fondo** también pide confirmar.
6. Después de confirmar verás la composición completa. Si el fondo del proyecto también es blanco, usa **Transparencia** para comprobar que el recorte sí existe. Puedes poner otra imagen debajo desde **Capas**, o cambiar el color del proyecto en Audio → Salida.

El recorte es por color, no segmentación de personas mediante IA. Un fondo complejo y un sujeto con el mismo color requieren otro tipo de recorte. El archivo original no cambia. La cuadrícula es una ayuda de vista previa: la exportación actual genera el vídeo compuesto sobre su fondo, sin canal alfa independiente.

## Capas y línea de tiempo

- **Fotos / clips** añade escenas consecutivas a la pista base.
- **Capa** añade imágenes o vídeos superpuestos con su propia hora de inicio y duración. **T Texto** añade un texto independiente.
- **Capas** muestra el orden visual: arriba se ve delante, abajo detrás. Arrastra por **⋮⋮** o selecciona una capa y usa **↑ Delante / ↓ Detrás**. También puedes arrastrar verticalmente la barra de una capa en la línea de tiempo, incluso cruzando el vídeo base. El tiempo de aparición se conserva.
- Arrastra una barra horizontalmente para cambiar cuándo aparece; arrastra sus extremos para recortarla. En **Tiempo** hay campos numéricos, dividir, duplicar y eliminar. Las escenas del vídeo base son consecutivas y comparten un nivel visual; sus flechas cambian el orden temporal.
- Un logo o una estrella dibujados dentro de un archivo de vídeo forman parte del mismo clip. Para poner otra imagen detrás, quita el fondo del clip y coloca la imagen debajo de **Vídeo base**. Este orden no separa automáticamente los objetos que están grabados en el vídeo.
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

**Respaldo** descarga un `.divasvideo` con clips, imágenes, audio, capas, efectos y animaciones. **Abrir respaldo** crea una copia nueva. Los respaldos v39 se migran al abrirlos con el fondo intacto y sin añadir opacidad. Los proyectos anteriores a v42 conservan su orden original (vídeo base detrás, capas delante). El nuevo orden visual queda dentro del proyecto y del respaldo; versiones anteriores a v42 no interpretan ese nuevo orden. v39 no puede abrir un proyecto creado con el formato v40.

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

## Referencias de interacción

La organización de pistas y la distinción entre tiempo y orden visual siguen patrones habituales de editores como [Kdenlive](https://docs.kdenlive.org/en/user_interface/timeline.html). Se revisaron también [el flujo de chroma de CapCut](https://www.capcut.com/resource/chroma-key-software) y [OpenCut](https://github.com/OpenCut-app/OpenCut), un proyecto de código abierto con licencia MIT. Esta actualización implementa el flujo en el código de Divas; no incorpora el código ni los servicios premium de esos editores.
