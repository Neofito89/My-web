# Arquitectura del sistema de galerías (sergioalegre.com / git_web)

> Copia de trabajo en el repo de las decisiones de diseño acordadas antes
> de implementar el sistema de galerías. El original vive también como
> documento del proyecto "Página web" en Claude — esta copia es para que
> quede accesible directamente en el código, sin depender de Claude.

## 1. Flujo de trabajo del usuario

1. Exportar desde Lightroom a `src/images/galleries/<nombre-carpeta>/`, ya en el orden final, con nombres `nombre-galeria-001.jpg`, `nombre-galeria-002.jpg`, etc. (prefijo + número con ceros a la izquierda, mínimo 3 dígitos, para que el orden alfabético de archivo coincida siempre con el orden numérico deseado). Resolución de exportación habitual: ~2600px o más de lado largo.
2. Insertar `{% gallery "nombre-carpeta" %}` en cualquier página `.md` (con `layout: gallery.njk`). Shortcode deliberadamente mínimo: solo el nombre de carpeta, sin parámetros adicionales. Cualquier título o texto alrededor se escribe como markdown normal.
3. Para actualizar una galería existente: solo cambiar las fotos de la carpeta (añadir/quitar/renombrar) — no hace falta tocar el shortcode.
4. `npm run build` + sync manual por FTP/WinSCP (como ya se hace hoy).

## 2. Descubrimiento de galerías

- Automático: cualquier subcarpeta de `src/images/galleries/` es una galería válida invocable por su nombre. No hay que registrar nada en ningún sitio.
- Sin archivo de configuración por galería por ahora (se puede añadir más adelante si hace falta sin romper el sistema).

## 3. Pipeline de imágenes (build time, con eleventy-img + sharp)

Por cada foto de cada galería, generar en build:
- **Formatos**: AVIF + WebP + JPEG (fallback de máxima compatibilidad), vía `<picture>` con `source` en orden AVIF → WebP → `img` JPEG.
- **Anchos del grid**: 400 / 800 / 1200px.
- **Anchos del lightbox**: 1200 / 1920 / 2560px. eleventy-img no genera (ni upscala) variantes por encima del ancho real del archivo original — el valor 2560 actúa como techo seguro.
- **Cache**: cache automática de eleventy-img (nombre de archivo derivado con hash de contenido) — solo se reprocesan fotos nuevas o modificadas en cada build. En la implementación final los derivados se quedan en `dist/` (gitignorado, como el resto del build), regenerándose de forma incremental en la misma máquina; ver nota de la sección 8 sobre esta decisión.
- **Placeholder de carga**: blur-up — miniatura minúscula (~20px) en base64 incrustada inline en el HTML, con efecto de desenfoque ampliado mientras carga la versión nítida, y fade-in al terminar.
- **Originales**: los archivos exportados de Lightroom (alta resolución, carpetas de `src/images/galleries/`) SÍ se versionan en git, aceptando que el repositorio crecerá de forma notable y permanente con el tiempo (sin Git LFS ni limpieza de historial por ahora).

## 4. Layout del grid: filas justificadas (justified rows)

- Estilo Flickr/Google Photos: cada foto conserva su ratio original (sin recortar), las fotos se agrupan en filas escaladas a una altura objetivo y ligeramente ajustadas para llenar el ancho completo. Se descarta masonry por columnas (rompe el orden de lectura fila a fila que define Lightroom) y se descarta el grid uniforme con recorte (contradice el requisito de mantener el ratio original).
- **Cálculo**: build time (Node/Eleventy, vía el paquete `justified-layout` de Flickr), no en el navegador. Se generan 3 breakpoints fijos — móvil (<600px), tablet (600–1000px), desktop (>1000px) — cada uno como su propio bloque HTML, visible solo el que corresponde vía media queries CSS.
- **Render responsive sin JS**: dentro de cada breakpoint, cada foto es un flex item con `flex-grow` igual a su propio aspect ratio y `flex-basis: 0`; flexbox reparte el ancho disponible de la fila en esa proporción, lo que da matemáticamente la misma altura final para todas las fotos de la fila sin recortar ninguna, y se adapta de forma continua a cualquier ancho real de ventana (no solo a los 3 anchos usados para decidir el agrupamiento en build).
- **Dimensiones objetivo**: altura de fila ~280–320px en desktop (normalmente 3–5 fotos/fila) y ~140–160px en móvil (normalmente 2–3 fotos/fila); gap ~8px entre fotos.
- Contenedor ancho dedicado (`gallery.njk` + `.gallery-wide`, máx. 1400px) en vez de la columna de texto de 580px de `base.njk`.

## 5. Lightbox: PhotoSwipe v5

- Click en cualquier foto del grid abre PhotoSwipe a pantalla completa, con navegación entre fotos (flechas de teclado, swipe táctil en móvil, zoom).
- Sin captions/texto por foto (ni en el grid ni en el lightbox) — solo imágenes.
- `preload: [1, 1]` precarga la foto siguiente/anterior en resolución grande mientras se visualiza la actual.
- Selección de formato (AVIF > WebP > JPEG) por feature-detection en el cliente, autoalojado desde `node_modules/photoswipe` (sin CDN).

## 6. Índice curado "Selected Works"

Caso de uso distinto: una página con 6–10 galerías elegidas a mano, cada una con una miniatura de portada que enlaza a la página/URL donde vive esa galería (no un índice automático de todas las galerías).

- Shortcode dedicado `{% selectedWorks [...] %}`, con la lista de entradas pasada como parámetros directamente en el propio `.md` de la página: por entrada, carpeta de galería + URL de destino + (opcional) foto de portada concreta (`cover`, número de foto empezando en 1).
- Portada por defecto: primera foto de la galería si no se especifica `cover`.
- Mismo algoritmo de filas justificadas que las galerías internas, para consistencia visual.

## 7. Decisiones explícitamente descartadas

- Masonry por columnas (CSS `column-count`): rompe el orden de lectura fila a fila.
- Grid uniforme con recorte (`object-fit: cover`) para el grid de galería interna: no respeta el ratio original.
- Cálculo de layout 100% en JS de cliente sin resolución en build.
- Página índice automática que liste todas las galerías sin curación.
- Limpiar toda la cache de imágenes en cada build (coste de build a largo plazo, especialmente AVIF).
- Commitear a git los derivados generados (`dist/img/galleries/`): se decidió en el diseño inicial, pero al implementar se vio que `dist/` ya está enteramente gitignorado y crear una excepción anidada era frágil; se dejó como está (gitignorado, regenerado localmente), ya que los originales sí están versionados y eso cubre el caso real de uso (una sola máquina de desarrollo).

## 8. Hallazgos durante la implementación

- `npm run build` (a diferencia de `npm start`) no ejecutaba `watch-assets.js`, así que no copiaba `styles.css` a `dist/` en un build de producción limpio. Se añadió un passthrough copy en `.eleventy.js` para que el build sea autosuficiente.
- Un archivo de documentación con ejemplos de shortcodes NO puede vivir dentro de `src/` sin cuidado: Eleventy trata todo `.md` bajo `src/` como plantilla Nunjucks (`markdownTemplateEngine: "njk"`), así que un ejemplo literal como `{% gallery "..." %}` se ejecuta de verdad. Por eso la documentación vive en `docs/` (esta carpeta), fuera del árbol que procesa Eleventy.
