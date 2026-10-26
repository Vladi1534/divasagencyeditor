# Pruebas de Divas Video

Ejecuta `node tests/video-model.cjs` para validar tiempos, recortes y respaldos.

Las pruebas de integración usan `playwright`. Instálalo en tu entorno de desarrollo y proporciona un Chromium mediante `CHROMIUM_EXECUTABLE`, o usa el instalado por Playwright. Los scripts abren un servidor HTTP local temporal y bloquean las solicitudes de Supabase.

Define `DIVAS_VIDEO_FIXTURES` con una carpeta que contenga:

- `photo.png`: imagen cuadrada.
- `clip.mp4`: clip vertical de 4 segundos con sonido, por ejemplo un patrón de prueba y un tono de 440 Hz.
- `music.wav`: audio de 3 segundos, por ejemplo un tono de 880 Hz.

Se pueden generar el clip y el audio con FFmpeg:

```sh
ffmpeg -f lavfi -i testsrc2=size=180x320:rate=30 -f lavfi -i sine=frequency=440:sample_rate=48000 -t 4 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest clip.mp4
ffmpeg -f lavfi -i sine=frequency=880:sample_rate=48000 -t 3 music.wav
```

Ejecuta `node tests/video-browser.cjs` y `node tests/video-integration.cjs`. `DIVAS_VIDEO_QA_DIR` permite elegir dónde quedan las descargas de prueba. Son temporales: no deben publicarse en el sitio.

Las pruebas cubren recursos reales, recorte, división, música, IndexedDB, respaldo, exportación, cancelación, tamaños móviles, integración del flyer y conflictos entre pestañas. La exportación tiene que comprobarse también con FFprobe: no basta con que el navegador descargue un archivo.

## v40 · recorte, capas y exportación

`npm --prefix tests run test:video:v40` ejecuta las reglas de datos, las pruebas del efecto por píxeles y el recorrido de navegador de v40. Se mantienen los recorridos `video-browser.cjs` y `video-integration.cjs` para detectar regresiones de v39.

Además de los fixtures anteriores, `video-v40.cjs` utiliza `backdrop.png` (180 × 320, RGB 20/35/230) y un clip con sujeto rojo sobre fondo verde. Se pueden crear con Python/Pillow y FFmpeg:

```sh
python -c "from PIL import Image; Image.new('RGB',(180,320),(20,35,230)).save('backdrop.png')"
ffmpeg -f lavfi -i color=c=0x00ff00:s=180x320:r=30:d=3 -f lavfi -i color=c=red:s=50x80:r=30:d=3 -filter_complex "[0:v][1:v]overlay=x='20+25*t':y=110:shortest=1" -c:v libx264 -pix_fmt yuv420p keyclip.mp4
```

La prueba comprueba píxeles reales del canvas para el cuentagotas, automático, comparación original y cuadrícula; también recorre arrastre, bloqueo, máscaras, recorte de extremos, deshacer, texto independiente, animación, audio, persistencia, respaldo y exportación. Genera capturas a 360 y 390 px y exige un lienzo visible de más de 180 px con los controles de fondo abiertos. No simula un teléfono físico.

La salida WebM de prueba se decodificó con FFmpeg: 720 × 1280, 30 fps, 3 segundos, fondo azul visible y sujeto rojo conservado en todos los fotogramas muestreados a 2 fps. Se midió también la atenuación del audio al inicio y al final. El Chromium de pruebas no ofrece codificación MP4; ese formato sigue dependiendo del navegador.

## v41 · inicio unificado

`CHROMIUM_EXECUTABLE=/ruta/chromium npm --prefix tests run test:projects` recorre la página real con Supabase bloqueado. Crea un diseño y dos vídeos con archivos de prueba, verifica filtros, búsqueda, orden, duración, retomar el proyecto correcto, renombrar, respaldo directo, recarga, resúmenes anteriores a v41, separación por cuenta, aviso entre pestañas, eliminación y recuperación de errores de almacenamiento. Comprueba los filtros y el retorno a Mis proyectos en 360, 390 y 1440 px. Los ganchos de pruebas se inyectan solo por el servidor local; no se publican.

## v42 · antes/después, confirmación y orden visual

`CHROMIUM_EXECUTABLE=/ruta/chromium npm --prefix tests run test:video:v42` utiliza además `whiteclip.mp4`, un vídeo vertical de tres segundos con un sujeto rojo sobre blanco:

```sh
ffmpeg -f lavfi -i color=c=white:s=180x320:r=30:d=3 -f lavfi -i color=c=red:s=50x80:r=30:d=3 -filter_complex "[0:v][1:v]overlay=x=65:y=110:shortest=1" -c:v libx264 -pix_fmt yuv420p whiteclip.mp4
```

Comprueba píxeles reales del original, del recorte, la división y el sujeto; una vista previa no cambia el proyecto guardado. Cubre confirmar/cancelar, deshacer, cuentagotas y automático, color equivocado, selección fuera del intervalo, controles claros/oscuros, medidas 360/390/1440 px, botones de orden, arrastre del asa y de la barra a través de la pista principal, tiempos intactos, reapertura desde Mis proyectos, respaldo y exportación. Las reglas del modelo incluyen el orden al dividir y la compatibilidad con respaldos anteriores. El recorrido v40 usa ahora la confirmación explícita de v42.

Los clips de prueba son sintéticos. Las capturas facilitadas por el usuario permiten revisar el flujo, pero no sustituyen una prueba con su archivo original.

El WebM de v42 se decodificó con FFmpeg a 2 fotogramas por segundo: 6 muestras, 720 × 1280, 30 fps y 3 segundos. En todas se conserva el sujeto rojo y aparece azul la zona de fondo blanco eliminada, procedente de una capa situada detrás del vídeo base.


## v43 · Colocación directa y encuadre proporcional

`CHROMIUM_EXECUTABLE=/ruta/chromium npm --prefix tests run test:video:v43` comprueba convertir escenas en capas delante/detrás, foto como fondo durante toda la composición, volver a secuencia, reordenar, deshacer/rehacer, bloqueo, cancelación y destino en el panel Capas. Incluye entrada táctil mediante CDP y medidas de interfaz de 320, 360, 390 y 1440 px; no equivale a probar un móvil físico.

Además de `clip.mp4`, se utiliza `square.png` (240 × 240, fondo RGB 20/100/230, franja izquierda verde de 30 px, derecha amarilla de 30 px y cuadrado rojo central de 80 × 80). Puede generarse así:

```python
from PIL import Image, ImageDraw
im = Image.new('RGB', (240, 240), (20, 100, 230))
d = ImageDraw.Draw(im)
d.rectangle((0, 0, 29, 239), fill=(30, 230, 100))
d.rectangle((210, 0, 239, 239), fill=(250, 220, 20))
d.rectangle((80, 80, 159, 159), fill=(245, 20, 30))
im.save('square.png')
```

Los píxeles distinguen Completa, Llenar y Adaptar. Se comprueba que el cuadrado central conserve la misma anchura y altura en las tres proporciones. El recorrido descarga un respaldo y un vídeo, reabre desde Mis proyectos y restaura el respaldo. Las pruebas del modelo cubren también proyectos largos, fotos con transparencia, encuadres manuales, límites, IDs, efectos y ajuste temporal a clips vecinos.

`PW_TEST_SCREENSHOT_NO_FONTS_READY=1` evita esperar fuentes remotas en equipos de prueba sin acceso a Google Fonts. `DIVAS_SKIP_SCREENSHOTS=1` permite separar las comprobaciones funcionales de las capturas visuales en un navegador de pruebas cuyo compositor no capture después de la emulación táctil. Las capturas se deben revisar por separado antes de publicar.

La salida v43 se verificó con FFprobe y decodificación de FFmpeg: VP8/WebM, 1280 × 720, 30 fps, 4 segundos; 8 muestras a 2 fps conservan el sujeto rojo cuadrado y los laterales suaves. Se probaron el renderizado con SwiftShader y las capturas con composición por CPU. El Chromium de pruebas no ofrece codificación MP4; no se afirma una validación nueva de ese codificador.


## v44 · Protección del logo, teclado y composición

- `npm --prefix tests run test:video:v44`: conectividad del fondo, blanco encerrado conservado, chroma global, compatibilidad del modelo, píxeles del lienzo, confirmar/deshacer, foco al seleccionar, Supr/Retroceso, duplicar, bloqueo, flechas, guardar, respaldo y exportación real. Fixture incluido en `tests/fixtures/video/white-detail.png`.
- `npm --prefix tests run test:flyer:v44`: 24 planes (seis familias × cuatro formatos), márgenes y áreas de lectura sin solapamiento, generación real de seis propuestas distintas, tres logos únicos con opacidad completa, pares tipográficos, render y reajuste a formato vertical. El acceso de inspección del generador se inyecta únicamente en el servidor de pruebas.
- El recorrido móvil se verifica a 320, 360 y 390 px, además de escritorio 1440 px. Se mantienen las regresiones v40/v42/v43. Los selectores se actualizaron para la nueva ubicación de las herramientas; sus verificaciones de contenido siguen activas.
- WebM v44 decodificado con FFmpeg: 720 × 720, 30 fps, cinco segundos; exterior oscuro, blanco interior conservado y dorado visible. El original de vídeo del usuario no se adjuntó: los fixtures reproducen el problema de dos zonas del mismo blanco, pero no equivalen a evaluar su clip concreto.
- El fondo exterior usa una máscara de conectividad de cuatro vecinos por fotograma y limpieza de bordes neutros; se reutiliza el resultado de imágenes estáticas y fotogramas pausados. No hay modelo de segmentación automática de personas. Chroma global conserva WebGL cuando está disponible y respaldo CPU.
