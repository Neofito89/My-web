const fs = require('fs');
const path = require('path');
const Image = require("@11ty/eleventy-img");
const registerGalleryShortcodes = require("./eleventy/gallery.js");

const OUTPUT_DIR = "./dist/img/";
const URL_PATH = "/img/";

// --- Helpers ---
async function processImage(src, widths) {
  return Image(src, {
    widths,
    formats: ["avif", "webp", "jpeg"],
    outputDir: OUTPUT_DIR,
    urlPath: URL_PATH,
    filenameFormat: (id, src, width, format) => {
      const name = path.basename(src, path.extname(src));
      return `${name}-${width}.${format}`;
    },
    sharpOptions: {
      fit: "inside"
    },
    formatOptions: {
      jpeg: { quality: 82, mozjpeg: true },
      webp: { quality: 80 },
      avif: { quality: 50 }
    }
  });
}

async function imageShortcode(src, alt, sizes = "(max-width: 768px) 100vw, 720px") {
  const metadata = await processImage(src, [320, 640, 1024]);

  return Image.generateHTML(metadata, {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async"
  });
}

async function thumbShortcode(src, alt, sizes = "(max-width: 768px) 50vw, 300px") {
  const metadata = await processImage(src, [200, 400, 600]);

  return Image.generateHTML(metadata, {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
    class: "thumb"
  });
}

async function imageLinkShortcode(src, alt) {
  const metadata = await processImage(src, [320, 640, 1024]);
  const largest = metadata.jpeg[metadata.jpeg.length - 1];

  const imgHTML = Image.generateHTML(metadata, {
    alt,
    sizes: "(max-width: 768px) 100vw, 720px",
    loading: "lazy",
    decoding: "async"
  });

  return `<a href="${largest.url}" target="_blank" rel="noopener">${imgHTML}</a>`;
}

// --- Config ---
module.exports = function(eleventyConfig) {

  // Watch / dev
  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");
  eleventyConfig.setChokidarConfig({
    usePolling: true,
    interval: 500
  });

  eleventyConfig.setWatchThrottleWaitTime(100);
  eleventyConfig.setUseGitIgnore(false);

  // Assets
  eleventyConfig.addPassthroughCopy({ "src/css/fonts": "css/fonts" });
  // Hallazgo al implementar la galería: "npm run build" (a diferencia de
  // "npm start") no ejecuta watch-assets.js, así que sin esta línea
  // styles.css nunca llegaba a dist/ en un build de producción limpio
  // (solo en dev, vía el watcher). Se añade aquí para que el build sea
  // autosuficiente; no interfiere con watch-assets.js en desarrollo.
  eleventyConfig.addPassthroughCopy({ "src/css/styles.css": "css/styles.css" });
  // Nota: "src/images/galleries" queda fuera a propósito. Esas fotos las
  // procesa el shortcode "gallery" (eleventy/gallery.js) vía eleventy-img,
  // que ya genera y sirve las variantes optimizadas — copiarlas aquí
  // también duplicaría los originales de alta resolución en dist/ sin
  // necesidad.
  eleventyConfig.addPassthroughCopy("src/images/*.{png,ico,svg,jpg,jpeg,webmanifest}");
  eleventyConfig.addPassthroughCopy("src/images/social");
  // .htaccess (compresión + cache-control): fuera de src/ porque no es una
  // plantilla ni un asset de contenido, es config del servidor Apache.
  eleventyConfig.addPassthroughCopy({ "config/.htaccess": ".htaccess" });

  // JS de galería (script cliente, sin bundler) + vendor PhotoSwipe.
  // Igual que con styles.css: "npm run build" no copiaba nada a dist/js/,
  // así que en un build de producción limpio (a diferencia de "npm start")
  // gallery.js y PhotoSwipe no llegaban a dist/. Resultado en remoto: la
  // galería se quedaba en el placeholder blur y el click abría el JPEG
  // suelto en vez de abrir el lightbox.
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({
    "node_modules/photoswipe/dist/photoswipe-lightbox.esm.min.js": "js/vendor/photoswipe/photoswipe-lightbox.esm.min.js",
    "node_modules/photoswipe/dist/photoswipe.esm.min.js": "js/vendor/photoswipe/photoswipe.esm.min.js",
    "node_modules/photoswipe/dist/photoswipe.css": "js/vendor/photoswipe/photoswipe.css"
  });

  // Global
  eleventyConfig.addGlobalData("year", new Date().getFullYear());
  // Cache-busting para styles.css y gallery.js: sus nombres de archivo no
  // llevan hash de contenido (a diferencia de las imágenes generadas por
  // eleventy-img), así que se les añade "?v=<build>" en la URL para poder
  // darles Cache-Control de un año en .htaccess sin servir una versión
  // vieja tras el siguiente despliegue.
  eleventyConfig.addGlobalData("buildTime", Date.now());

  // Shortcodes
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
  eleventyConfig.addNunjucksAsyncShortcode("thumb", thumbShortcode);
  eleventyConfig.addNunjucksAsyncShortcode("imageLink", imageLinkShortcode);
   eleventyConfig.addShortcode("youtube", function(id) {
    return `
      <div class="video">
        <iframe 
          src="https://www.youtube-nocookie.com/embed/${id}"
          frameborder="0"
          allowfullscreen
          loading="lazy">
        </iframe>
      </div>
    `;
  });

  // SVG inline
  eleventyConfig.addNunjucksShortcode("inlineSVG", function(filePath) {
    const fullPath = path.join(__dirname, 'src', filePath);
    try {
      return fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      console.error(`Error leyendo SVG: ${fullPath}`, err);
      return '';
    }
  });

  // SVG opcional
  eleventyConfig.addNunjucksAsyncShortcode("svgIcon", async filename => {
    const metadata = await Image(filename, {
      formats: ["svg"],
      dryRun: true,
    });
    return metadata.svg[0].buffer.toString();
  });

  // Galerías: shortcodes {% gallery %} y {% selectedWorks %}
  registerGalleryShortcodes(eleventyConfig);

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_includes/layouts",
      output: "dist"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};