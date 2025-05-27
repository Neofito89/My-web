const fs = require('fs');
const path = require('path');

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addGlobalData("year", new Date().getFullYear());
  eleventyConfig.addShortcode("inlineSVG", function(filePath) {
    const fullPath = path.join(__dirname, 'src', filePath); // Ajusta 'src' si tu carpeta fuente es otra
    try {
      return fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      console.error(`Error leyendo SVG: ${fullPath}`, err);
      return ''; // Retorna cadena vacía si falla la lectura
    }
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
