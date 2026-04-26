const fs = require('fs');
const path = require('path');
const Image = require("@11ty/eleventy-img");

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

  eleventyConfig.addWatchTarget("./src/");
  eleventyConfig.addWatchTarget("./src/**/*.md");
  eleventyConfig.setWatchThrottleWaitTime(100);
  eleventyConfig.setUseGitIgnore(false);

  // Assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy({ "src/css/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy("src/images");

  // Global
  eleventyConfig.addGlobalData("year", new Date().getFullYear());

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