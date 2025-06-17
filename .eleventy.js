const fs = require('fs');
const path = require('path');
const Image = require("@11ty/eleventy-img");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
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
