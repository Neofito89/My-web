const fs = require('fs');
const path = require('path');
const Image = require("@11ty/eleventy-img");

module.exports = function(eleventyConfig) {
  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");
  eleventyConfig.setChokidarConfig({
  usePolling: true,
  interval: 500
});
  eleventyConfig.addWatchTarget("./src/**/*.md");
  eleventyConfig.setWatchThrottleWaitTime(100);
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.addWatchTarget("./src/");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy({ "src/css/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy("src/images");

  eleventyConfig.addGlobalData("year", new Date().getFullYear());

  // Imagen responsive
  eleventyConfig.addNunjucksAsyncShortcode("image", async function(src, alt, outputFormat = "jpeg") {
    let metadata = await Image(src, {
      widths: [300, 600],
      formats: [outputFormat],
      outputDir: "./dist/img/",
      urlPath: "/img/"
    });

    let imageAttributes = {
      alt,
      sizes: "(max-width: 600px) 100vw, 600px",
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(metadata, imageAttributes);
  });

  // Carga SVG desde disco
  eleventyConfig.addNunjucksShortcode("inlineSVG", function(filePath) {
    const fullPath = path.join(__dirname, 'src', filePath);
    try {
      return fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      console.error(`Error leyendo SVG: ${fullPath}`, err);
      return '';
    }
  });

  
  
  
  // Opcional: otro shortcode de SVG con eleventy-img
  eleventyConfig.addNunjucksAsyncShortcode("svgIcon", async filename => {
    const metadata = await Image(filename, {
      formats: ["svg"],
      dryRun: true,
    });
    return metadata.svg[0].buffer.toString();
  });


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

// .eleventy.js
const Image = require("@11ty/eleventy-img");
const path = require("path");

const OUTPUT_DIR = "./dist/images/";
const URL_PATH = "/images/";

// Helper común
async function processImage(src, widths) {
  return Image(src, {
    widths,                          // ej: [320, 640, 1024]
    formats: ["avif", "webp", "jpeg"],
    outputDir: OUTPUT_DIR,
    urlPath: URL_PATH,
    filenameFormat: (id, src, width, format) => {
      const name = path.basename(src, path.extname(src));
      return `${name}-${width}.${format}`;
    },
    sharpOptions: {
      // Mantiene proporciones automáticamente (no crop)
      fit: "inside"
    },
    // Calidad afinada para fotografía
    formatOptions: {
      jpeg: { quality: 82, mozjpeg: true },
      webp: { quality: 80 },
      avif: { quality: 50 }
    }
  });
}

// 1) Imagen “estándar” (para texto / páginas)
async function imageShortcode(src, alt, sizes = "(max-width: 768px) 100vw, 720px") {
  const metadata = await processImage(src, [320, 640, 1024]);

  return Image.generateHTML(metadata, {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async"
  });
}

// 2) Miniatura (grid)
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

// 3) Imagen con enlace a versión “grande” (máx 1024)
async function imageLinkShortcode(src, alt) {
  const metadata = await processImage(src, [320, 640, 1024]);

  // Elegimos la mayor JPEG como fallback para el href
  const largest = metadata.jpeg[metadata.jpeg.length - 1];

  const imgHTML = Image.generateHTML(metadata, {
    alt,
    sizes: "(max-width: 768px) 100vw, 720px",
    loading: "lazy",
    decoding: "async"
  });

  return `<a href="${largest.url}" target="_blank" rel="noopener">${imgHTML}</a>`;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
  eleventyConfig.addNunjucksAsyncShortcode("thumb", thumbShortcode);
  eleventyConfig.addNunjucksAsyncShortcode("imageLink", imageLinkShortcode);
};
