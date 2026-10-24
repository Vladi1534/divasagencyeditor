# Divas Agency Editor

Editor estático para proyectos, recursos privados de agencia y flyers editables. El acceso y los archivos compartidos utilizan la instalación Supabase existente. Cloudflare Workers publica el paquete estático completo mediante la configuración del repositorio.

## Publicación en Cloudflare

El comando de despliegue es `npx wrangler deploy`, ejecutado desde la raíz del repositorio. `wrangler.jsonc` prepara automáticamente `public/` con `index.html`, la plantilla y **todos los archivos de assets/**. El empaquetado falla si falta un módulo esencial de Manuales o Video. No se requieren dependencias de compilación ni otro SQL para esta corrección.

No publiques solo el HTML: los botones de Manuales y Video necesitan sus módulos, estilos y bibliotecas locales. Un despliegue verde debe comprobarse abriendo ambos botones en la web publicada. `public/` se genera; no se edita ni se sube a Git.

## v42 · Recorte comprobable y capas delante/detrás

**Quitar fondo** identifica siempre el elemento seleccionado y ofrece **Antes / Después / Comparar / Transparencia**. Elegir un color prepara una vista previa; **Confirmar recorte** la aplica y **Cancelar** conserva el estado anterior. El indicador avisa cuando el color casi no aparece. Los botones de colores se ven también en tema oscuro.

**Capas** permite arrastrar el orden o usar **Delante / Detrás**, incluso respecto al vídeo principal. El orden visual se guarda, se exporta y viaja en el respaldo sin modificar los tiempos. Si el elemento seleccionado no aparece en el momento actual, **Ver esta capa** lleva a su fotograma. No requiere SQL. Consulta [la guía de Divas Video](docs/DIVAS-VIDEO.md).

## v41 · Mis proyectos: diseños y vídeos juntos

El inicio reúne diseños y vídeos con filtros visibles **Todos / Diseños / Vídeos**, búsqueda, orden, miniaturas y duración. Cada tarjeta abre su editor. **Mis proyectos** dentro de Video regresa a ese inicio; **Crear video** empieza uno nuevo sin reemplazar el anterior. Los vídeos ya guardados aparecen automáticamente en su cuenta y navegador, sin migración ni SQL. Su menú permite descargar el respaldo y eliminarlos. Los diseños de cuenta siguen en Supabase; los vídeos siguen en el dispositivo y se identifican como tales.

La lista usa solo resúmenes, sin cargar los clips al inicio. Se actualiza al guardar, eliminar, volver a la página o recibir cambios de otra pestaña.

## v40 · Vídeo con capas y recorte de fondo

Botón destacado **Quitar fondo** con cuentagotas, detección de color uniforme, bordes suaves y comparación. Añade capas de vídeo, imagen y texto, línea de tiempo, animación entre dos poses, audio independiente, máscaras y deshacer/rehacer. Los proyectos v39 siguen abriendo. No requiere SQL. Consulta [la guía de Divas Video](docs/DIVAS-VIDEO.md).

## v38 · Del manual al flyer

- Biblioteca privada desde el inicio y desde **☰ → Manuales → flyers**.
- PDF por página; Word `.docx` y texto `.txt` por sección.
- Administración: subir, renombrar, archivar y eliminar. Las cuentas aprobadas pueden consultar documentos disponibles y crear sus propios flyers.
- Tres composiciones Divas, fondos de la agencia, logo oficial y marca de agua como capas separadas.
- Cuatro formatos: 9:16, 1:1, 16:9 y 1428 × 400.
- El texto largo se distribuye en una serie. Se puede guardar un flyer o la serie completa.
- Los proyectos conservan el documento y página de origen; **☰ → Ver documento de origen** vuelve a abrirlos.

### Activación

1. Ejecuta completo [supabase/13-divas-documentos.sql](supabase/13-divas-documentos.sql) en el SQL Editor del proyecto Supabase que ya usa el editor. Es una migración adicional, no una reinstalación. No modifica las cuentas, proyectos ni recursos existentes.
2. Publica **index.html y la carpeta assets completa**. Esta versión incluye el lector PDF local; reemplazar solo `index.html` no basta.
3. Entra como administrador, abre Manuales → flyers y sube el documento. No hace falta crear otro usuario ni compartir claves privadas.

La configuración crea `divas_documents` y el bucket **privado** `divas-documents`. Requiere las funciones de autorización de la instalación Divas anterior. Si se ejecuta en otro proyecto, muestra un error claro y revierte la migración.

Consulta [la guía de documentos](docs/MANUALES-Y-FLYERS.md) para el uso, los límites y los detalles del guardado.

### Desarrollo local

Sirve la raíz por HTTP, por ejemplo `python3 -m http.server 8080`. Abre `http://localhost:8080`. El lector PDF usa módulos y un worker; abrir el HTML con `file://` no es un modo de ejecución admitido.

### Pruebas

En `tests/` están las comprobaciones de PostgreSQL/RLS y de navegador con Supabase simulado. No escriben en producción. Las dependencias de pruebas se instalan aparte; no intervienen en la publicación estática.

```sh
npm --prefix tests install
npm --prefix tests exec playwright install chromium
npm --prefix tests test
```

Para usar un Chromium ya instalado, define `DIVAS_TEST_BROWSER` con su ruta. Las capturas y los resultados se guardan en `test-output/`.

La prueba de publicación sirve exclusivamente la carpeta generada: ejecuta `node scripts/build-static.mjs` y después `npm --prefix tests run test:delivery`. Comprueba los módulos y sus tipos de contenido, abre Video y Manuales en móvil y escritorio, y verifica que SQL, pruebas y configuración no se incluyan como archivos públicos.

## Divas Video · v39

Incluye la biblioteca Manuales → flyers de v38 y el editor de video de v39. Publica `index.html` y toda la carpeta `assets/` juntos. Video guarda sus proyectos en este navegador; Manuales utiliza la migración `supabase/13-divas-documentos.sql`.

Consulta [Divas Video](docs/DIVAS-VIDEO.md) y [pruebas de video](tests/README-video.md).
