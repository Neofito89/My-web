# Galerías

Cada subcarpeta de `src/images/galleries/` es una galería invocable desde
cualquier página `.md` (con `layout: gallery.njk`) con:

```
{% gallery "nombre-de-la-carpeta" %}
```

## Cómo exportar desde Lightroom

1. Define el orden final de las fotos en Lightroom (arrastrando en el
   Filmstrip / Grid view).
2. Exporta a `src/images/galleries/nombre-de-la-carpeta/`, a una resolución
   de exportación de **al menos 2600px** de lado largo.
3. Nombre de archivo: prefijo + número con ceros a la izquierda (mínimo 3
   dígitos), por ejemplo:

   ```
   nombre-de-la-carpeta-001.jpg
   nombre-de-la-carpeta-002.jpg
   ...
   nombre-de-la-carpeta-042.jpg
   ```

   El orden de la galería en la web es el orden alfabético de estos
   nombres de archivo — por eso el padding de ceros es importante (sin él,
   "10.jpg" se colaría alfabéticamente antes que "2.jpg").

4. `npm run build` (o `npm run rebuild` para limpiar `dist/` antes) y
   sincroniza por FTP como siempre.

## Actualizar una galería existente

No hace falta tocar ningún shortcode ni plantilla: basta con añadir,
quitar o sustituir fotos dentro de la carpeta de esa galería y volver a
compilar.

## Índice curado "Selected Works"

Para mostrar una selección de galerías con portada + enlace (sin listar
automáticamente todas), usa el shortcode `selectedWorks` en la página que
haga de índice, por ejemplo `src/selected-work/index.md`:

```njk
{% selectedWorks [
  { gallery: "nombre-de-la-carpeta", url: "/ruta-a-la-pagina/" },
  { gallery: "otra-carpeta", url: "/otra-ruta/", cover: 3 }
] %}
```

`cover` es opcional: el número de foto (empezando en 1) que se usa como
portada. Si no se indica, se usa la primera foto de la galería.

Ver `docs/galeria-arquitectura.md` para el detalle completo de las
decisiones de diseño detrás de este sistema.
