import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const publicRoot = resolve("public/models");
const contracts = JSON.parse(await readFile("src/data/3d-asset-contracts.json", "utf8"));
const sourceFiles = [
  "src/lib/3d-assets.ts",
  "src/components/three/ProbeModel.tsx",
  "src/components/three/HangarCanvas.tsx",
  "src/components/three/MissionCanvas.tsx",
  "src/components/three/FindCanvas.tsx",
  "src/components/three/AssetDiagnostics.tsx",
];
const individualRoots = [
  "tools/blender/finds_individual",
  "tools/blender/damage_repair_individual",
  "tools/blender/space_environment_individual",
];

async function filesIn(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? filesIn(path) : extname(path) === ".glb" ? [path] : [];
    }))).flat();
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

function readJsonChunk(buffer) {
  if (buffer.toString("utf8", 0, 4) !== "glTF") throw new Error("Not a binary glTF file");
  let offset = 12;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.toString("utf8", offset + 4, offset + 8);
    if (type === "JSON") return JSON.parse(buffer.toString("utf8", offset + 8, offset + 8 + length));
    offset += 8 + length;
  }
  throw new Error("GLB has no JSON chunk");
}

function summariseGlb(gltf) {
  const names = (gltf.nodes ?? []).map((node, index) => node.name || `(unnamed node ${index})`);
  const counts = names.reduce((result, name) => ({ ...result, [name]: (result[name] ?? 0) + 1 }), {});
  return {
    nodes: names,
    duplicates: Object.entries(counts).filter(([, count]) => count > 1).map(([name, count]) => ({ name, count })),
    blenderSuffixes: names.filter((name) => /\.\d{3}$/.test(name)),
  };
}

async function inventoryOf(root) {
  const inventory = {};
  for (const path of (await filesIn(root)).sort()) {
    inventory[relative(root, path).replaceAll("\\", "/")] = summariseGlb(readJsonChunk(await readFile(path)));
  }
  return inventory;
}

const inventory = await inventoryOf(publicRoot);
const allPublicNames = new Set(Object.values(inventory).flatMap((entry) => entry.nodes));
const NODE_NAME = /^(Probe|SolarPanel|Antenna|Camera|Sensor|Thruster|IonDrive|CargoPod|BatteryPack|ScienceModule|CommunicationsBox|Damage|Repair|Veteran|Personality|Hangar|Dock|LaunchRail|InspectionLight|Planet|Earth|Moon|Mars|Venus|Asteroid|Star_Sun|Space_|Orbit_|Mission_|Signal_|Navigation_|Unknown_|Find_|CargoCase|Archive_|CF_Starfield)/;
const codeNames = new Set();
for (const file of sourceFiles) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/["'`]([A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9.]+)+)["'`]/g)) {
    const name = match[1];
    if (NODE_NAME.test(name)) codeNames.add(name);
  }
}

const assetsSource = await readFile("src/lib/3d-assets.ts", "utf8");
const mappedFinds = [...assetsSource.matchAll(/"((?:Find|CargoCase|Archive)_[A-Za-z0-9_]+)"/g)].map((match) => match[1]);
const gameplayPaths = new Set([
  "cosmoforge_probe.glb",
  "cosmoforge_hangar3.glb",
  "cosmoforge_damage_repair_kit.glb",
  "cosmoforge_space_environment_pack.glb",
  ...mappedFinds.map((name) => `finds/${name}.glb`),
]);

await writeFile("3D_ASSET_NODE_INVENTORY.json", `${JSON.stringify(inventory, null, 2)}\n`);

const results = contracts.map((contract) => {
  const key = contract.path.replace(/^\/models\//, "");
  const actual = inventory[key];
  return {
    ...contract,
    fileExists: Boolean(actual),
    runtime: gameplayPaths.has(key) ? "gameplay" : "shipped-unmapped",
    missingNodes: actual ? contract.expectedNodes.filter((name) => !actual.nodes.includes(name)) : contract.expectedNodes,
    duplicates: actual?.duplicates ?? [],
    blenderSuffixes: actual?.blenderSuffixes ?? [],
  };
});

const codeMissing = [...codeNames].sort().filter((name) => !allPublicNames.has(name));
const unmappedPublic = Object.keys(inventory).filter((key) => !gameplayPaths.has(key)).sort();

const individualInventories = {};
for (const directory of individualRoots) {
  individualInventories[directory] = await inventoryOf(resolve(directory));
}

const lines = ["# CosmoForge 3D asset validation", "", `Generated from ${Object.keys(inventory).length} GLBs in \`public/models\`.`, ""];
for (const result of results) {
  const ok = result.fileExists && result.missingNodes.length === 0 && result.duplicates.length === 0 && result.blenderSuffixes.length === 0;
  lines.push(
    `## ${result.label} ${ok ? "✓" : "✗"}`,
    "",
    `File: \`${result.path}\``,
    "",
    `Runtime: ${result.runtime === "gameplay" ? "loaded by React/Three.js" : "present in public/models, not referenced by gameplay mappings"}`,
    "",
    `Expected nodes: ${result.expectedNodes.map((name) => `\`${name}\``).join(", ")}`,
    "",
    `Missing: ${result.missingNodes.length ? result.missingNodes.map((name) => `\`${name}\``).join(", ") : "none"}`,
    "",
    `Duplicate names: ${result.duplicates.length ? result.duplicates.map(({ name, count }) => `\`${name}\` (${count})`).join(", ") : "none"}`,
    "",
    `Blender .001/.002 suffixes: ${result.blenderSuffixes.length ? result.blenderSuffixes.map((name) => `\`${name}\``).join(", ") : "none"}`,
    "",
  );
}

lines.push("## Code node references", "");
if (codeMissing.length) {
  lines.push("Names referenced by React/Three.js that do not exist in any public GLB:", "", ...codeMissing.map((name) => `- \`${name}\``), "");
} else {
  lines.push("Every underscored node name referenced by the 3D React code exists in a public GLB.", "");
}

lines.push("## Public GLBs not loaded by gameplay mappings", "");
if (unmappedPublic.length) {
  lines.push("These files are validated and served, but `MODEL_PATHS` / `LOOT_3D_MODELS` do not load them yet:", "", ...unmappedPublic.map((name) => `- \`${name}\``), "");
} else {
  lines.push("Every public GLB is referenced by a gameplay mapping.", "");
}

lines.push("## Individual Blender exports", "");
for (const [directory, files] of Object.entries(individualInventories)) {
  const keys = Object.keys(files);
  lines.push(`### \`${directory}\``, "", keys.length ? `Audited ${keys.length} GLBs.` : "No GLBs found.", "");
  for (const [file, actual] of Object.entries(files)) {
    const rootName = file.replace(/\.glb$/i, "");
    const missingRoot = actual.nodes.includes(rootName) ? "none" : `\`${rootName}\``;
    const suffix = actual.blenderSuffixes.length ? actual.blenderSuffixes.map((name) => `\`${name}\``).join(", ") : "none";
    const duplicates = actual.duplicates.length ? actual.duplicates.map(({ name, count }) => `\`${name}\` (${count})`).join(", ") : "none";
    lines.push(`- \`${file}\` — missing filename root: ${missingRoot}; duplicates: ${duplicates}; Blender suffixes: ${suffix}`);
  }
  lines.push("");
}

await writeFile("3D_ASSET_VALIDATION.md", `${lines.join("\n")}\n`);

const individualProblems = Object.values(individualInventories).flatMap((files) => Object.entries(files).flatMap(([file, actual]) => {
  const problems = [];
  if (actual.duplicates.length) problems.push(`${file} duplicates`);
  if (actual.blenderSuffixes.length) problems.push(`${file} blender suffixes`);
  return problems;
}));

console.log(`Audited ${Object.keys(inventory).length} public GLBs and ${Object.values(individualInventories).reduce((sum, files) => sum + Object.keys(files).length, 0)} individual exports.`);
if (codeMissing.length) console.error("Code references missing from public GLBs:", codeMissing.join(", "));
if (unmappedPublic.length) console.warn("Public GLBs not loaded by gameplay mappings:", unmappedPublic.join(", "));
if (results.some((result) => !result.fileExists || result.missingNodes.length || result.duplicates.length || result.blenderSuffixes.length) || codeMissing.length || individualProblems.length) {
  process.exitCode = 1;
}
