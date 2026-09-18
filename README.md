# sergioalegre.com

Web personal de fotografía de Sergio Alegre: portfolio con galerías y lightbox.

## Stack

- [Eleventy](https://www.11ty.dev/) (v3) + Nunjucks
- CSS propio, sin frameworks
- Fuentes autoalojadas (Poiret One, Josefin Sans, Jost, Work Sans)
- [eleventy-img](https://www.11ty.dev/docs/plugins/image/) + sharp para optimizar imágenes (AVIF/WebP/JPEG)
- [PhotoSwipe](https://photoswipe.com/) para el lightbox
- Layout de galería en filas justificadas (estilo Flickr/Google Photos)

## Desarrollo

```bash
npm install
npm start
```

Genera el sitio estático en `dist/`.

```bash
npm run build
```

## Galerías

Para añadir una galería nueva:

1. Exportar las fotos a `src/images/galleries/<nombre-carpeta>/` con nombres numerados (`nombre-001.jpg`, `nombre-002.jpg`, ...).
2. Insertar `{% gallery "nombre-carpeta" %}` en la página `.md` donde quieras mostrarla.

El resto (formatos, tamaños, orden, lightbox) se genera automáticamente en el build.

## Despliegue

`npm run build` y subida manual del contenido de `dist/` por FTP.
