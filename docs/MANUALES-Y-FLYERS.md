# Manuales → flyers · Divas v38

## Un recorrido corto

1. **Guardar el manual.** El administrador elige un PDF, DOCX o TXT, escribe un título y, si quiere, el tema o aplicación. Al marcar «Disponible para mi equipo», las cuentas aprobadas pueden consultarlo. El original queda intacto.
2. **Elegir la información.** Abre una página del PDF o una sección de Word. La página original aparece al lado del texto extraído. Puedes dejar solo el fragmento que necesitas, corregir el orden o pegar texto.
3. **Diseñar.** Prueba Oro nocturno, Rosa perla o Rosa glow. Elige el formato. El fondo recomendado usa los recursos publicados de la agencia; también puedes escoger otro o el fondo del editor.
4. **Darle tu toque.** «Editar este flyer» crea un proyecto independiente. Si hay varios, «Guardar los N flyers» guarda la serie completa. Después editas las capas y usas Descargar, como en cualquier otro proyecto.

En móvil, **Ampliar** muestra el flyer con los controles apartados; **Ver controles** permite volver a los ajustes. La vista previa se actualiza mientras escribes y no cierra el teclado.

## Logo y procedencia

La composición usa el mismo logo de la cabecera: primero el oficial publicado en el catálogo y después el configurado en Identidad de agencia. El logo superior y la marca de agua son capas de imagen separadas. Puedes desmarcar cualquiera. Si falta un logo válido, el editor lo indica y no lo sustituye por una marca inventada.

Cada flyer conserva el identificador del manual, su nombre, huella SHA-256, página o sección y fragmento utilizado. La referencia sobre el lienzo se puede ocultar. El enlace de origen vuelve a comprobar el acceso; si el manual fue retirado, el flyer sigue siendo editable.

## Qué hace esta versión

La propuesta combina diseños de composición y tipografía con el texto seleccionado. **No usa un servicio de IA generativa** y no inventa instrucciones, importes, condiciones ni beneficios. La serie mantiene las palabras y cifras del fragmento; el usuario decide qué contenido excluir antes de diseñar.

El manual de Salsa no viene incluido. Los documentos de `tests/fixtures/` son muestras artificiales para comprobar el funcionamiento y no son material oficial de ninguna aplicación.

## Formatos y límites

| Entrada | Selección | Límite |
|---|---|---|
| PDF con texto | Página física del archivo; se indica la numeración impresa si es diferente | 25 MB, 1000 páginas |
| Word `.docx` | Títulos y secciones; no páginas simuladas | 25 MB, 1000 secciones; XML principal hasta 8 MB |
| Texto `.txt` | Secciones de texto | 1 MB; UTF-8 o UTF-16 con BOM |

Cada propuesta admite hasta 12.000 caracteres y una serie de hasta 12 flyers. Un fragmento muy extenso puede requerir seleccionar menos texto. Cada formato reparte el contenido según el espacio de lectura disponible.

- Un `.doc` antiguo debe guardarse como `.docx` o PDF.
- Un PDF protegido con contraseña debe exportarse a una copia sin contraseña.
- Las páginas escaneadas se muestran, pero esta versión **no incluye OCR**: puedes pegar o escribir la información en el campo de texto.
- El DOCX se lee como texto; no se reproducen su diseño, dibujos, ecuaciones o paginación. Las tablas y las columnas del PDF requieren revisar el orden del texto extraído.
- Los gráficos y fotografías del manual no se importan como capas. Los fondos y logos proceden del catálogo de agencia y de la identidad ya configurada.

## Guardado y recuperación

El archivo se identifica por contenido (SHA-256), no por nombre. Volver a subirlo abre la copia ya guardada. Una versión modificada es un nuevo documento y puede tener el mismo título.

La subida reserva los metadatos y guarda el original. Una función de Supabase comprueba que el archivo existe y que su tamaño y tipo coinciden antes de marcarlo como disponible. Si se corta la conexión, pulsa Guardar otra vez: se comprueba el recibo y se reutiliza el registro. Si aparece «Subida pendiente», vuelve a elegir el mismo archivo para continuar.

Los flyers se guardan con la cola de proyectos existente. Si falla el guardado, la propuesta permanece abierta y el reintento conserva el identificador del proyecto. Los avances anteriores no se sobrescriben.

Archivar oculta el manual al equipo y retira el acceso a su original en Storage. Eliminar primero lo archiva, después elimina el archivo y finalmente sus metadatos. Si falla una parte, el registro permanece para reintentar. Los proyectos y las descargas ya creadas conservan la información que contienen.

## Publicación y respaldo

La versión consta de `index.html`, `plantilla-divas.json` y `assets/`, además de documentación, pruebas y la migración. **Publicar únicamente el index deja incompleta la biblioteca.** El ZIP de respaldo incluye la versión completa.

La migración se ejecuta una vez; no se necesita repetirla para añadir manuales. Las nuevas subidas y cambios se realizan desde la página. Los documentos consumen el almacenamiento y las transferencias del proyecto Supabase existente.

## Dependencias

PDF.js **6.4.299**, distribución legacy oficial, se incluye con su licencia Apache 2.0 en `assets/vendor/pdfjs/`. Se carga solo al abrir un PDF. El worker, las fuentes estándar, CMaps y decodificadores se sirven desde el propio sitio; los manuales no se envían a un servicio de extracción externo. El DOCX utiliza el lector ZIP local del editor y extracción XML de texto; sus scripts, enlaces y macros no se ejecutan.

Referencias técnicas: [PDF.js](https://mozilla.github.io/pdf.js/), [API de PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html), [Storage y RLS de Supabase](https://supabase.com/docs/guides/storage/security/access-control).
