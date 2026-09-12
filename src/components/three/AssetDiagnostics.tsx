"use client";

import { useEffect, useState } from "react";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import rawContracts from "@/data/3d-asset-contracts.json";

type AssetContract = {
  id: string;
  label: string;
  path: string;
  expectedNodes: string[];
};

type AssetResult = AssetContract & {
  status: "loading" | "valid" | "invalid" | "failed";
  missingNodes: string[];
  error?: string;
};

const contracts = rawContracts as AssetContract[];

function validateNames(contract: AssetContract, names: Set<string>): AssetResult {
  const missingNodes = contract.expectedNodes.filter((name) => !names.has(name));
  return { ...contract, status: missingNodes.length ? "invalid" : "valid", missingNodes };
}

export function AssetDiagnostics() {
  const [results, setResults] = useState<AssetResult[]>(() => contracts.map((contract) => ({ ...contract, status: "loading", missingNodes: [] })));

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let active = true;
    const loader = new GLTFLoader();
    Promise.all(contracts.map(async (contract): Promise<AssetResult> => {
      try {
        const gltf = await loader.loadAsync(contract.path);
        const names = new Set<string>();
        gltf.scene.traverse((object) => { if (object.name) names.add(object.name); });
        const result = validateNames(contract, names);
        console.info(`${contract.label} ${result.status === "valid" ? "✓" : "✗"}`);
        for (const name of contract.expectedNodes) console.info(`${name} ${names.has(name) ? "✓" : "✗ MISSING"}`);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`${contract.label} ✗ LOAD FAILED`);
        for (const name of contract.expectedNodes) console.info(`${name} ✗ MISSING`);
        return { ...contract, status: "failed", missingNodes: contract.expectedNodes, error: message };
      }
    })).then((next) => { if (active) setResults(next); });
    return () => { active = false; };
  }, []);

  if (process.env.NODE_ENV !== "development") return null;
  const problems = results.filter((result) => result.status === "invalid" || result.status === "failed");
  const loading = results.some((result) => result.status === "loading");
  const missing = results.flatMap((result) => result.missingNodes.map((name) => ({ name, label: result.label, error: result.error })));

  return <details className="mt-3 border-t border-amber-400/20 pt-3" open={Boolean(problems.length)}>
    <summary>3D ASSET DIAGNOSTICS // {loading ? "CHECKING" : problems.length ? `${problems.length} PROBLEMS` : "ALL CLEAR"}</summary>
    <div className="mt-2 grid gap-1 text-xs font-normal">
      {results.map((result) => (
        <div key={result.id} className={result.status === "valid" ? "text-emerald-300" : result.status === "loading" ? "text-slate-500" : "text-rose-300"}>
          {result.label} {result.status === "valid" ? "✓" : result.status === "loading" ? "…" : "✗"}
          {result.error ? ` — ${result.error}` : ""}
        </div>
      ))}
      {missing.map((item) => (
        <div key={`${item.label}-${item.name}`} className="text-rose-300">{item.name} ✗ MISSING</div>
      ))}
    </div>
  </details>;
}
