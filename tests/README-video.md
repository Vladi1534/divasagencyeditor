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
