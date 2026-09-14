const chokidar = require("chokidar");
const fs = require("fs");

const source = "src/css/styles.css";
const destination = "dist/css/styles.css";

console.log("CSS WATCHER INICIADO");

function copyCss() {
  fs.copyFileSync(source, destination);
  console.log(">>> CSS COPIADO FORZOSAMENTE");
}

copyCss();

chokidar.watch(source, {
  persistent: true,
  usePolling: true,
  interval: 500
}).on("change", () => {
  console.log(">>> CAMBIO EN STYLES.CSS");
  copyCss();
});