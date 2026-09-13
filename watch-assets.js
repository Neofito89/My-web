const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");

const SRC = path.resolve("src/css");
const DEST = path.resolve("dist/css");

function syncCss() {
  fs.cpSync(SRC, DEST, {
    recursive: true,
    force: true
  });

  console.log("✓ CSS sincronizado → dist/css");
}

syncCss();

chokidar.watch(SRC, {
  ignoreInitial: true,
  persistent: true
}).on("all", () => {
  syncCss();
});