# Validación de v39 integrada · 23 de octubre de 2026

Esta entrega une Manuales → flyers de v38 con Divas Video de v39 sobre la versión 37 publicada. Conserva los proyectos, roles, recursos y herramientas existentes.

## Resultado comprobado en la entrega combinada

- 26 pruebas PostgreSQL/RLS: privacidad, roles, migración repetible, confirmación y eliminación de documentos.
- 52 comprobaciones de interfaz de documentos: PDF, DOCX, TXT, página de origen, logo, marca de agua, cuatro formatos, guardado y recuperación. Vistas de 360, 390 y 1440 píxeles.
- 6 pruebas del modelo de video: recorte, división, tiempos, límites y respaldo.
- Integración: captura del flyer sin alterar sus píxeles, guardado real en IndexedDB, conflictos entre pestañas, copia de recuperación, separación por cuenta y rechazo de respaldos dañados.
- Interfaz de video: fotos y clips, música, recorte, división, duplicación, orden, eliminación, recarga, respaldo portátil, exportación y cancelación. Sin errores de JavaScript ni desbordamiento horizontal en las vistas de móvil comprobadas.
- Exportación WebM verificada con FFprobe: VP8, 720 × 1280, 30 fps, 150 fotogramas; audio Opus, 5,02 segundos incluyendo el relleno del códec. Se comprobó por separado que la música y el audio del clip aparecen en sus intervalos.
- Sintaxis de los scripts y presencia de todos los recursos referenciados.

Las pruebas utilizan archivos sintéticos y respuestas Supabase simuladas. No modifican cuentas, proyectos ni archivos de producción. La salida MP4 depende de los codificadores del navegador; en este Chromium se comprobó la alternativa WebM. No se realizó una prueba en un teléfono físico.

## Activación

Publicar `index.html` con toda la carpeta `assets/`. Manuales requiere ejecutar una vez `supabase/13-divas-documentos.sql` en el proyecto Supabase del editor. Video no requiere otra migración: guarda en este navegador y permite descargar un respaldo `.divasvideo`.

Después de la publicación queda la comprobación con una cuenta real: abrir Manuales, subir un documento y generar un flyer. Las pruebas locales no confirman si la migración ya fue aplicada en producción.
