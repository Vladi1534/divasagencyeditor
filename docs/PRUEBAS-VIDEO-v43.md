# Divas Video v43 · comprobación de entrega

Fecha: 26 de octubre de 2026. Base: `f151b6b04f415531b504e9a98e1cac2ba6684f08` (v42).

## Resultado

- 18 comprobaciones del modelo: tiempos, efectos, conversión entre secuencia/capas, IDs, duración del fondo, bloqueo, límites, encuadre manual, transparencia y compatibilidad.
- Recorrido v43 en Chromium: secuencia → capa delante/detrás → secuencia; reordenación; destino en el panel Capas; cancelar; deshacer/rehacer; arrastre táctil mediante CDP; archivos externos soltados en el lienzo y en la secuencia.
- Encuadre comprobado por píxeles: Completa, Llenar y Adaptar; sujeto cuadrado sin deformación en 1:1, 9:16 y 16:9. Reapertura desde Mis proyectos y restauración de respaldo.
- Vista móvil revisada a 320, 360 y 390 px; escritorio a 1440 px. Sin desbordamiento horizontal del diálogo. Lienzo horizontal visible de 160 a 174 px de altura en móvil con las pistas desplegadas.
- Regresiones v40 y v42: quitar fondo por color, confirmación/cancelación, antes/después, movimiento, tamaño, máscara, recorte temporal, orden de capas, texto animado, audio, respaldo y exportación.
- Entrega estática: 218 archivos de ejecución; Manuales y Video abren a 390 y 1440 px; las rutas y tipos de contenido son correctos; no se publican SQL, pruebas ni configuración interna.
- Ningún error JavaScript durante los recorridos funcionales.

## Vídeo real

Se exportó y decodificó el archivo de prueba con FFmpeg/FFprobe: WebM/VP8, 1280 × 720, 30 fps, 4 segundos. Ocho fotogramas muestreados a 2 fps conservan el cuadrado rojo, sus proporciones y los laterales suaves. La vista previa y la exportación usan el mismo renderizador.

## Alcance

Los archivos son sintéticos; la captura del usuario sirvió para reproducir el flujo de una foto añadida después del vídeo. No se dispuso del vídeo original de Halloween. La prueba móvil emula dimensiones y entrada táctil; no se hizo en un teléfono físico. Se verificaron renderizado SwiftShader y composición por CPU. MP4 depende del codificador del navegador; el Chromium utilizado exporta WebM. No hubo cambios de datos, cuentas o SQL de Supabase.

Las instrucciones para reproducir las pruebas están en `tests/README-video.md`.
