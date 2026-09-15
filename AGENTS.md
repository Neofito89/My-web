# Proyecto web

## Tecnología y estructura
- Sitio estático creado con Eleventy (11ty) 3.1.0.
- La salida de compilación es `dist/`.
- El código fuente se organiza en `src/`, con plantillas y parciales en `src/_includes/`, estilos en `src/css/` e imágenes en `src/images/`.
- No editar directamente los archivos generados en `dist/`; modificar siempre las fuentes.
- Documentación que no tiene que vivir en un directorio concreto (guías, decisiones de diseño): en `docs/`, fuera de `src/`. Importante: Eleventy trata todo `.md` dentro de `src/` como plantilla Nunjucks (`markdownTemplateEngine: "njk"`), así que un ejemplo literal de shortcode en un `.md` bajo `src/` se ejecutaría de verdad — por eso esta documentación se mantiene fuera de `src/`.

## Diseño
- Mantener una estética minimalista, moderna y elegante.
- Referencias visuales: Mondaine y Braun.
- Priorizar composición limpia, tipografía sobria, mucho espacio en blanco, jerarquía clara y animaciones discretas.
- Evitar efectos decorativos innecesarios, gradientes llamativos y interfaces recargadas.

## Galerías
- Sistema de galerías con filas justificadas (sin recortar el ratio original) y lightbox (PhotoSwipe): `{% gallery "nombre-carpeta" %}` en cualquier `.md`, leyendo de `src/images/galleries/nombre-carpeta/`.
- Índice curado de galerías (portada + link, sin listar todas automáticamente): `{% selectedWorks [...] %}`.
- Lógica en `eleventy/gallery.js`; ver `docs/galerias.md` para la convención de nombres de exportación desde Lightroom, y `docs/galeria-arquitectura.md` para el diseño completo (también disponible como documento del proyecto "Página web" en Claude).
- Las páginas con galería usan `layout: gallery.njk` (contenedor ancho) en vez de `layout: base.njk` (columna de texto de 580px).

## Forma de trabajar
- Antes de cambios amplios, revisar la estructura y los patrones existentes.
- Mantener los cambios acotados a la petición y preservar el trabajo no relacionado.
- Ejecutar la compilación o el servidor de desarrollo apropiado después de modificar plantillas, estilos o configuración.
- Informar de los archivos modificados y de cualquier decisión de diseño relevante.