"use strict";

/**
 * Sistema de galerías de imágenes.
 *
 * Uso en cualquier .md:
 *   {% gallery "nombre-carpeta" %}
 *     -> Renderiza todas las fotos de src/images/galleries/nombre-carpeta/
 *        (en orden alfabético de archivo, que debe coincidir con el orden
 *        numérico gracias al padding de ceros en el nombre exportado desde
 *        Lightroom) como un grid de filas justificadas, con lightbox
 *        (PhotoSwipe) al hacer click.
 *
 *   {% selectedWorks [
 *        { gallery: "nombre-carpeta", url: "/ruta-destino/" },
 *        { gallery: "otra-carpeta", url: "/otra-ruta/", cover: 3 }
 *      ] %}
 *     -> Renderiza un grid curado de portadas (una foto por entrada) que
 *        enlazan a la URL indicada, en vez de abrir el lightbox. "cover" es
 *        opcional (número de foto, empezando en 1); por defecto se usa la
 *        primera foto de la galería.
 *
 * Ver docs/galerias.md y docs/galeria-arquitectura.md para la convención
 * de nombres de exportación y el detalle de las decisiones de diseño
 * detrás de esta implementación.
 */

const fs = require("fs");
const path = require("path");
const Image = require("@11ty/eleventy-img");
const justifiedLayout = require("justified-layout");

const GALLERIES_DIR = path.join(__dirname, "..", "src", "images", "galleries");
const GALLERY_OUTPUT_DIR = "./dist/img/galleries/";
const GALLERY_URL_PATH = "/img/galleries/";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// Anchos generados por uso (ver arquitectura, sección 3).
const GRID_WIDTHS = [400, 800, 1200];
const LIGHTBOX_WIDTHS = [1200, 1920, 2560];

const FORMAT_OPTIONS = {
  jpeg: { quality: 82, mozjpeg: true },
  webp: { quality: 80 },
  avif: { quality: 50 },
};

// Anchos de contenedor "representativos" usados solo para decidir cuántas
// fotos entran por fila en cada breakpoint (ver arquitectura, sección 4).
// El tamaño real en pantalla lo resuelve CSS (flexbox) de forma continua,
// así que estos valores no necesitan coincidir con ningún ancho real
// concreto: solo influyen en el AGRUPAMIENTO por fila.
const BREAKPOINTS = [
  { key: "mobile", containerWidth: 380, targetRowHeight: 150 },
  { key: "tablet", containerWidth: 900, targetRowHeight: 260 },
  { key: "desktop", containerWidth: 1200, targetRowHeight: 300 },
];

const ROW_GAP_PX = 8;

// widowLayoutStyle "justify" hace que la última fila incompleta también se
// estire a ancho completo, igual que el resto de filas — así no hace falta
// tratarla como caso especial en el render (ver notas de investigación).
const JUSTIFIED_OPTIONS = {
  boxSpacing: ROW_GAP_PX,
  containerPadding: 0,
  widowLayoutStyle: "justify",
};

// --- Utilidades de archivo ---

function getGalleryDir(folderName) {
  return path.join(GALLERIES_DIR, folderName);
}

function getGalleryFiles(folderName) {
  const dir = getGalleryDir(folderName);
  if (!fs.existsSync(dir)) {
    throw new Error(
      `[gallery] No existe la carpeta "src/images/galleries/${folderName}". ` +
        `Comprueba el nombre exacto de la carpeta exportada desde Lightroom.`
    );
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    // Orden alfabético = orden numérico gracias al padding de ceros
    // (nombre-galeria-001.jpg, nombre-galeria-002.jpg, ...). Se usa
    // localeCompare con `numeric: true` como red de seguridad adicional
    // por si algún archivo no llevara padding.
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    .map((f) => path.join(dir, f));

  if (files.length === 0) {
    throw new Error(
      `[gallery] La carpeta "src/images/galleries/${folderName}" no contiene fotos (.jpg/.jpeg/.png).`
    );
  }
  return files;
}

// --- Procesado de imágenes (eleventy-img + sharp) ---

async function buildPhotoData(filePath, { needsLightbox, alt }) {
  const gridMetadata = await Image(filePath, {
    widths: GRID_WIDTHS,
    formats: ["avif", "webp", "jpeg"],
    outputDir: GALLERY_OUTPUT_DIR,
    urlPath: GALLERY_URL_PATH,
    sharpOptions: { fit: "inside" },
    formatOptions: FORMAT_OPTIONS,
  });

  // Placeholder "blur-up": miniatura minúscula en base64, generada con
  // dryRun (no se escribe a disco) siguiendo el mismo patrón que ya usa
  // el shortcode "svgIcon" existente en .eleventy.js.
  const blurMetadata = await Image(filePath, {
    widths: [20],
    formats: ["jpeg"],
    dryRun: true,
    sharpOptions: { fit: "inside" },
    formatOptions: { jpeg: { quality: 35 } },
  });
  const blurDataUrl = `data:image/jpeg;base64,${blurMetadata.jpeg[0].buffer.toString("base64")}`;

  const largestGrid = gridMetadata.jpeg[gridMetadata.jpeg.length - 1];
  const aspectRatio = largestGrid.width / largestGrid.height;

  let lightbox = null;
  if (needsLightbox) {
    const lightboxMetadata = await Image(filePath, {
      widths: LIGHTBOX_WIDTHS,
      formats: ["avif", "webp", "jpeg"],
      outputDir: GALLERY_OUTPUT_DIR,
      urlPath: GALLERY_URL_PATH,
      sharpOptions: { fit: "inside" },
      formatOptions: FORMAT_OPTIONS,
    });
    const largestJpeg = lightboxMetadata.jpeg[lightboxMetadata.jpeg.length - 1];
    lightbox = {
      jpeg: largestJpeg,
      webp: lightboxMetadata.webp && lightboxMetadata.webp[lightboxMetadata.webp.length - 1],
      avif: lightboxMetadata.avif && lightboxMetadata.avif[lightboxMetadata.avif.length - 1],
      width: largestJpeg.width,
      height: largestJpeg.height,
    };
  }

  return { grid: gridMetadata, aspectRatio, blurDataUrl, lightbox, alt };
}

// --- Layout de filas justificadas ---

// Devuelve, para un breakpoint dado, un array de filas; cada fila es un
// array de { item, width } (mismo orden que `items`) agrupados según el
// algoritmo de Flickr. El agrupamiento en filas Y el ancho resultante de
// cada caja los calcula justified-layout; el ancho real en pantalla lo
// resuelve CSS vía flexbox a partir del aspect ratio (ver
// `renderJustifiedGrid`), pero el ancho que devuelve aquí la librería es ya
// una muy buena aproximación de ese ancho real — se usa tal cual para el
// atributo `sizes` de cada imagen (ver sección 3 de
// claude/galeria-arquitectura.md: cada bloque de breakpoint solo se
// descarga cuando es el visible, así que un `sizes` fijo en px por bloque
// es válido, a diferencia de un `sizes` en vw pensado para un único grid
// compartido entre breakpoints).
function computeRows(items, getAspectRatio, breakpoint) {
  const ratios = items.map(getAspectRatio);
  const layout = justifiedLayout(ratios, {
    ...JUSTIFIED_OPTIONS,
    containerWidth: breakpoint.containerWidth,
    targetRowHeight: breakpoint.targetRowHeight,
  });

  const rows = [];
  let currentTop = null;
  let currentRow = null;

  layout.boxes.forEach((box, i) => {
    if (box.top !== currentTop) {
      currentRow = [];
      rows.push(currentRow);
      currentTop = box.top;
    }
    // Math.ceil para no quedarnos cortos por redondeo (mejor pedir algún
    // px de más que servir una imagen ligeramente pequeña para su caja).
    currentRow.push({ item: items[i], width: Math.ceil(box.width) });
  });

  return rows;
}

// Genera el HTML de los 3 bloques (uno por breakpoint); solo uno es visible
// a la vez gracias a los media queries de la sección "GALERÍA" de
// styles.css. `renderItem(item, aspectRatio, width, isFirstRow)` debe
// devolver el HTML de una caja concreta del grid; `width` es el ancho en px
// calculado por justified-layout para esa foto en ese breakpoint, listo
// para usar como `sizes`. `isFirstRow` marca las fotos de la primera fila:
// esas son siempre visibles nada más cargar la página (están "above the
// fold" por definición, en los 3 breakpoints), así que no deben cargarse
// con loading="lazy" — eso retrasaba el LCP porque el navegador no
// empezaba a pedir esa imagen hasta terminar de resolver el layout (ver
// PageSpeed: "LCP request discovery" / "LCP breakdown").
function renderJustifiedGrid(items, getAspectRatio, renderItem, wrapperClass) {
  return BREAKPOINTS.map((bp) => {
    const rows = computeRows(items, getAspectRatio, bp);
    const rowsHtml = rows
      .map((row, rowIndex) => {
        const boxesHtml = row
          .map(({ item, width }) => renderItem(item, getAspectRatio(item), width, rowIndex === 0))
          .join("\n");
        return `<div class="gallery-row">${boxesHtml}</div>`;
      })
      .join("\n");
    return `<div class="${wrapperClass} ${wrapperClass}--${bp.key}">${rowsHtml}</div>`;
  }).join("\n");
}

// --- Render de una foto individual ---

function renderPicture(photo, sizes, priority) {
  const { grid, alt } = photo;
  const sourcesHtml = ["avif", "webp"]
    .filter((fmt) => grid[fmt])
    .map((fmt) => {
      const srcset = grid[fmt].map((entry) => `${entry.url} ${entry.width}w`).join(", ");
      return `<source type="image/${fmt}" srcset="${srcset}" sizes="${sizes}">`;
    })
    .join("\n    ");

  const jpegSrcset = grid.jpeg.map((entry) => `${entry.url} ${entry.width}w`).join(", ");
  const fallback = grid.jpeg[grid.jpeg.length - 1];

  // "priority" = foto de la primera fila del grid: se pide de inmediato
  // (loading="eager") y con prioridad alta de red (fetchpriority="high"),
  // en vez de esperar a que el navegador decida que hace falta.
  const loadingAttrs = priority
    ? `loading="eager"\n      fetchpriority="high"`
    : `loading="lazy"`;

  return `<picture>
    ${sourcesHtml}
    <img
      class="gallery-img"
      src="${fallback.url}"
      srcset="${jpegSrcset}"
      sizes="${sizes}"
      width="${fallback.width}"
      height="${fallback.height}"
      alt="${alt}"
      ${loadingAttrs}
      decoding="async"
    >
  </picture>`;
}

function renderGalleryItem(photo, aspectRatio, width, isFirstRow) {
  const pictureHtml = renderPicture(photo, `${width}px`, isFirstRow);
  const lb = photo.lightbox;
  const dataAttrs = [
    `data-jpeg="${lb.jpeg.url}"`,
    lb.webp ? `data-webp="${lb.webp.url}"` : "",
    lb.avif ? `data-avif="${lb.avif.url}"` : "",
    `data-pswp-width="${lb.width}"`,
    `data-pswp-height="${lb.height}"`,
  ]
    .filter(Boolean)
    .join(" ");

  return `<a
    class="gallery-item"
    href="${lb.jpeg.url}"
    ${dataAttrs}
    style="flex-grow:${aspectRatio}; background-image:url('${photo.blurDataUrl}');"
  >${pictureHtml}</a>`;
}

function renderSelectedWorkItem(entry, aspectRatio, width, isFirstRow) {
  const pictureHtml = renderPicture(entry.photo, `${width}px`, isFirstRow);
  return `<a
    class="selected-work-item"
    href="${entry.url}"
    style="flex-grow:${aspectRatio}; background-image:url('${entry.photo.blurDataUrl}');"
  >${pictureHtml}</a>`;
}

// --- Shortcodes ---

async function galleryShortcode(folderName) {
  if (!folderName || typeof folderName !== "string") {
    throw new Error('[gallery] Uso: {% gallery "nombre-carpeta" %}');
  }

  const files = getGalleryFiles(folderName);
  const photos = await Promise.all(
    files.map((file, i) =>
      buildPhotoData(file, { needsLightbox: true, alt: `Fotografía ${i + 1}` })
    )
  );

  const inner = renderJustifiedGrid(photos, (p) => p.aspectRatio, renderGalleryItem, "gallery-rows");

  return `<div class="gallery" data-gallery="${folderName}">${inner}</div>`;
}

async function selectedWorksShortcode(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(
      '[selectedWorks] Uso: {% selectedWorks [{ gallery: "carpeta", url: "/ruta/" }, ...] %}'
    );
  }

  const resolved = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.gallery || !entry.url) {
        throw new Error('[selectedWorks] Cada entrada necesita "gallery" y "url".');
      }
      const files = getGalleryFiles(entry.gallery);
      const coverIndex = entry.cover ? entry.cover - 1 : 0;
      const coverFile = files[coverIndex] || files[0];
      const photo = await buildPhotoData(coverFile, {
        needsLightbox: false,
        alt: `Portada de la galería ${entry.gallery}`,
      });
      return { photo, url: entry.url };
    })
  );

  const inner = renderJustifiedGrid(
    resolved,
    (entry) => entry.photo.aspectRatio,
    renderSelectedWorkItem,
    "gallery-rows"
  );

  return `<div class="selected-works" data-selected-works>${inner}</div>`;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addNunjucksAsyncShortcode("gallery", galleryShortcode);
  eleventyConfig.addNunjucksAsyncShortcode("selectedWorks", selectedWorksShortcode);

  // Vendor de PhotoSwipe: se autoaloja copiando los archivos ya
  // construidos de node_modules (sin CDN, igual que las fuentes).
  eleventyConfig.addPassthroughCopy({
    "node_modules/photoswipe/dist/photoswipe.esm.min.js": "js/vendor/photoswipe/photoswipe.esm.min.js",
    "node_modules/photoswipe/dist/photoswipe-lightbox.esm.min.js":
      "js/vendor/photoswipe/photoswipe-lightbox.esm.min.js",
    "node_modules/photoswipe/dist/photoswipe.css": "js/vendor/photoswipe/photoswipe.css",
  });

  eleventyConfig.addPassthroughCopy({ "src/js/gallery.js": "js/gallery.js" });
};
