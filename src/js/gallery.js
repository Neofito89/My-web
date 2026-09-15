// Script cliente para las galerías: fade-in del placeholder blur-up y
// lightbox (PhotoSwipe) con selección de formato (AVIF > WebP > JPEG).
// Se sirve como módulo ES nativo, sin bundler (ver gallery.njk).

import PhotoSwipeLightbox from "/js/vendor/photoswipe/photoswipe-lightbox.esm.min.js";

// Imágenes de prueba mínimas (1-2px) para detectar soporte real del
// navegador, en vez de fiarse de user-agent sniffing.
const AVIF_TEST_SRC =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=";
const WEBP_TEST_SRC =
  "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

function canDecode(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function pickBestFormat() {
  if (await canDecode(AVIF_TEST_SRC)) return "avif";
  if (await canDecode(WEBP_TEST_SRC)) return "webp";
  return "jpeg";
}

function fadeInLoadedImages() {
  document.querySelectorAll(".gallery-img").forEach((img) => {
    if (img.complete) {
      img.classList.add("is-loaded");
    } else {
      img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
    }
  });
}

// El CSS de PhotoSwipe solo hace falta cuando se abre el lightbox, no para
// pintar el grid de la galería — cargarlo aquí (en vez de con un <link>
// síncrono en el <head>) evita que bloquee el render inicial de la página
// (ver PageSpeed: "Render-blocking requests").
function loadPhotoSwipeCSS() {
  if (document.querySelector('link[data-photoswipe-css]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/js/vendor/photoswipe/photoswipe.css";
  link.dataset.photoswipeCss = "true";
  document.head.appendChild(link);
}

async function initGalleryLightbox() {
  const items = document.querySelectorAll("a.gallery-item");
  if (items.length === 0) return;

  loadPhotoSwipeCSS();
  const format = await pickBestFormat();
  items.forEach((item) => {
    const url = item.dataset[format] || item.dataset.jpeg;
    if (url) item.setAttribute("href", url);
  });

  const lightbox = new PhotoSwipeLightbox({
    gallery: ".gallery-rows",
    children: "a.gallery-item",
    pswpModule: () => import("/js/vendor/photoswipe/photoswipe.esm.min.js"),
    preload: [1, 1],
    bgOpacity: 0.95,
    padding: { top: 20, bottom: 20, left: 20, right: 20 },
  });
  lightbox.init();
}

fadeInLoadedImages();
initGalleryLightbox();
