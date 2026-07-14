/**
 * One-time model optimization pipeline: curates the raw uploaded .glb files
 * into web-ready assets under public/models/.
 *
 * For each keeper: dedup + prune, optional mesh simplification (heavy
 * models), all textures -> WebP capped at 1024px, quantization + meshopt
 * compression. Raw uploads stay recoverable in git history.
 *
 * Usage: node scripts/optimize-models.mjs [--src <dir>]
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  simplify,
  textureCompress,
  weld,
  quantize,
  meshopt,
} from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const srcIdx = process.argv.indexOf("--src");
const SRC = srcIdx > -1 ? process.argv[srcIdx + 1] : ".";
const OUT = "public/models";

/** file -> { out, simplifyRatio? } */
const KEEPERS = {
  "stylized_palm_tree_set.glb": { out: "palm-set.glb" },
  "vinyl__record_player.glb": { out: "record-player.glb" },
  "satellite.glb": { out: "satellite.glb", simplifyRatio: 0.35 },
  "Spaceship.glb": { out: "spaceship.glb" },
  "Astronaut.glb": { out: "astronaut.glb" },
  "racing_hover_car.glb": { out: "hover-car.glb", simplifyRatio: 0.5 },
  "retro_wave_lotus_espirit_sportcar.glb": { out: "lotus.glb", simplifyRatio: 0.6 },
};

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
mkdirSync(OUT, { recursive: true });

for (const [file, cfg] of Object.entries(KEEPERS)) {
  const srcPath = path.join(SRC, file);
  if (!existsSync(srcPath)) {
    console.log(`SKIP (missing): ${file}`);
    continue;
  }
  const before = statSync(srcPath).size;
  const doc = await io.read(srcPath);

  const transforms = [dedup(), prune()];
  if (cfg.simplifyRatio) {
    transforms.push(
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: cfg.simplifyRatio, error: 0.001 }),
    );
  }
  transforms.push(
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
    quantize(),
    meshopt({ encoder: MeshoptEncoder }),
  );

  await doc.transform(...transforms);
  const outPath = path.join(OUT, cfg.out);
  await io.write(outPath, doc);
  const after = statSync(outPath).size;
  console.log(
    `${file} -> ${cfg.out}: ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(2)}MB`,
  );
}
console.log("done");
