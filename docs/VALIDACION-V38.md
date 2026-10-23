# Validación · v38

Comprobada el 18 de octubre de 2026.

## Resultado

- **26 comprobaciones de PostgreSQL/RLS** con PGlite: ejecución repetida de la migración, roles, documentos pendientes, acceso al original, archivos archivados, confirmación de subida, tamaño máximo y eliminación.
- **52 comprobaciones de navegador** con Chromium: móvil de 390 × 844 y 360 × 740, escritorio de 1440 × 1000, PDF de 24 páginas, selección de la página 20, DOCX por títulos, TXT, páginas sin texto, tres estilos, cuatro formatos, logo y marca de agua, procedencia, edición y recuperación.
- Se simularon un recibo de subida perdido y un guardado de proyecto interrumpido. El reintento mantuvo un único documento/proyecto.
- Se guardó una serie de cuatro flyers y se comprobó que conserva todas las palabras y cifras del texto revisado.
- No hubo errores de ejecución en el navegador ni desbordamiento horizontal en las vistas comprobadas.
- Comprobación sintáctica del JavaScript y de las referencias a los archivos nuevos.

Las pruebas de interfaz utilizan respuestas Supabase simuladas; las reglas de permisos se ejecutaron por separado en PostgreSQL. No modificaron cuentas, archivos ni datos de producción. Los archivos de prueba no son un manual oficial de Salsa.

## Activación pendiente

1. Ejecutar `supabase/13-divas-documentos.sql` en el proyecto Supabase del editor.
2. Publicar la versión revisada, incluyendo `assets/` completo.
3. Verificar en Cloudflare con una cuenta administradora y otra aprobada: subir un manual real, abrirlo desde la segunda cuenta y guardar un flyer.

Las pruebas no dependen de un teléfono físico. El respaldo de esta entrega contiene el código del editor y la nueva configuración; no es una exportación de los datos o archivos de Supabase.
