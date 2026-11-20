// Copies the Human face models we use from node_modules into public/models so they
// are served from our own origin (no CDN). Runs automatically on `npm install`.
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
