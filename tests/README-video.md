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
