# Divas Agency Editor

Editor estático para proyectos, recursos privados de agencia y flyers editables. El acceso y los archivos compartidos utilizan la instalación Supabase existente. Cloudflare Pages publica los archivos del repositorio; no hay un paso de compilación.

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

## Divas Video · v39

Incluye la biblioteca Manuales → flyers de v38 y el editor de video de v39. Publica `index.html` y toda la carpeta `assets/` juntos. Video guarda sus proyectos en este navegador; Manuales utiliza la migración `supabase/13-divas-documentos.sql`.

Consulta [Divas Video](docs/DIVAS-VIDEO.md) y [pruebas de video](tests/README-video.md).
