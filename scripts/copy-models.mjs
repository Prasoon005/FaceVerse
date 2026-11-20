// Copies the Human face models we use from node_modules into public/models, and the
// ONNX Runtime WASM files used by the voice engine into public/ort, so they are served
// from our own origin (no CDN). Runs automatically on `npm install`.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@vladmandic", "human", "models");
const target = join(root, "public", "models");
const models = ["blazeface", "facemesh", "iris", "faceres", "emotion"];

if (!existsSync(source)) {
  console.warn("[copy-models] @vladmandic/human not installed yet, skipping.");
  process.exit(0);
}

mkdirSync(target, { recursive: true });
let count = 0;
for (const model of models) {
  const json = `${model}.json`;
  copyFileSync(join(source, json), join(target, json));
  count++;
  const manifest = JSON.parse(readFileSync(join(source, json), "utf8"));
  for (const group of manifest.weightsManifest ?? []) {
    for (const path of group.paths) {
      copyFileSync(join(source, path), join(target, path));
      count++;
    }
  }
}
console.log(`[copy-models] copied ${count} files to public/models`);

// ONNX Runtime (Transformers.js voice engine). Same variant Transformers.js picks by default.
const ortSource = join(root, "node_modules", "onnxruntime-web", "dist");
const ortTarget = join(root, "public", "ort");
const ortFiles = ["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"];
if (existsSync(ortSource)) {
  mkdirSync(ortTarget, { recursive: true });
  for (const file of ortFiles) copyFileSync(join(ortSource, file), join(ortTarget, file));
  console.log(`[copy-models] copied ${ortFiles.length} files to public/ort`);
} else {
  console.warn("[copy-models] onnxruntime-web not installed yet, skipping public/ort.");
}
