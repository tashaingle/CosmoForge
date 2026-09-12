"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, CanvasTexture, Color, MathUtils, Vector3, type Group, type Mesh, type MeshStandardMaterial, type Object3D } from "three";
import type { LootId, LootRarity } from "@/lib/probe-loot";
import {
  ARCHIVE_DISPLAY_PATH,
  cargoCaseLidName,
  cargoCasePath,
  FIND_HOOK_EMOTION,
  FIND_HOOK_MOVING_LIGHT,
  FIND_HOOK_SIGNAL_LIGHT,
  FIND_HOOK_TIMESTAMP_DISPLAY,
  FIND_HOOK_TIMESTAMP_TEXT,
  findModelPath,
  type FindPresentation,
} from "@/lib/3d-assets";
import type { ThreeQuality } from "./three-quality";
import { SceneCamera } from "./SceneCamera";
import { ThreeSceneFallback } from "./ThreeSceneFallback";

const CARGO_TARGET: [number, number, number] = [0, 0.28, 0];
const ARCHIVE_TARGET: [number, number, number] = [0, 0.38, 0];
const LID_OPEN = -1.55;
const CARGO_FIND_POSITION: [number, number, number] = [0, 0.28, 0.12];
const HOOK_NAMES = new Set([FIND_HOOK_SIGNAL_LIGHT, FIND_HOOK_EMOTION, FIND_HOOK_MOVING_LIGHT, FIND_HOOK_TIMESTAMP_DISPLAY, FIND_HOOK_TIMESTAMP_TEXT]);

function cloneFitted(source: Object3D, maxSize: number) {
  const object = source.clone(true);
  const size = new Box3().setFromObject(object).getSize(new Vector3());
  const longest = Math.max(size.x, size.y, size.z, 0.001);
  object.scale.setScalar(maxSize / longest);
  const fitted = new Box3().setFromObject(object);
  object.position.sub(fitted.getCenter(new Vector3()));
  object.position.y -= new Box3().setFromObject(object).min.y;
  return object;
}

function standardMaterials(object: Object3D): MeshStandardMaterial[] {
  const mesh = object as Mesh;
  if (!mesh.isMesh || !mesh.material) return [];
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return list.filter((material): material is MeshStandardMaterial => "emissive" in material);
}

function prepareFind(source: Object3D, maxSize: number) {
  const object = cloneFitted(source, maxSize);
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (mesh.isMesh && mesh.material) {
      const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => material.clone());
      mesh.material = materials.length === 1 ? materials[0] : materials;
    }
    if (HOOK_NAMES.has(child.name)) {
      child.userData.restPosition = child.position.clone();
      child.userData.restScale = child.scale.clone();
    }
  });
  const bakedText = object.getObjectByName(FIND_HOOK_TIMESTAMP_TEXT);
  if (bakedText) bakedText.visible = false;
  const display = object.getObjectByName(FIND_HOOK_TIMESTAMP_DISPLAY) as Mesh | undefined;
  if (display?.isMesh) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const texture = new CanvasTexture(canvas);
    const material = (Array.isArray(display.material) ? display.material[0] : display.material).clone() as MeshStandardMaterial;
    material.map = texture;
    material.emissiveMap = texture;
    material.emissive = new Color("#fbbf24");
    material.emissiveIntensity = 0.7;
    display.material = material;
    display.userData.timestampCanvas = canvas;
    display.userData.timestampTexture = texture;
    drawTomorrow(display, true);
  }
  return object;
}

function drawTomorrow(display: Mesh, force = false) {
  const canvas = display.userData.timestampCanvas as HTMLCanvasElement | undefined;
  const texture = display.userData.timestampTexture as CanvasTexture | undefined;
  if (!canvas || !texture) return;
  const now = new Date();
  const stamp = `${now.getUTCDate()}:${now.getUTCHours()}:${now.getUTCMinutes()}`;
  if (!force && display.userData.timestampStamp === stamp) return;
  display.userData.timestampStamp = stamp;
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const hours = String(tomorrow.getHours()).padStart(2, "0");
  const minutes = String(tomorrow.getMinutes()).padStart(2, "0");
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#071018";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fbbf24";
  context.font = "700 32px ui-monospace, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`T+${hours}:${minutes}`, canvas.width / 2, canvas.height / 2);
  texture.needsUpdate = true;
}

function pulseEmissive(object: Object3D, amount: number) {
  for (const material of standardMaterials(object)) material.emissiveIntensity = amount;
}

function animateFindHooks(root: Object3D, time: number, reducedMotion: boolean) {
  const signal = root.getObjectByName(FIND_HOOK_SIGNAL_LIGHT);
  if (signal?.userData.restScale) {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 4.2) * 0.22;
    signal.scale.copy(signal.userData.restScale).multiplyScalar(pulse);
    pulseEmissive(signal, reducedMotion ? 0.8 : 0.55 + (pulse - 1) * 3);
  }
  const emotion = root.getObjectByName(FIND_HOOK_EMOTION);
  if (emotion?.userData.restPosition) {
    const rest = emotion.userData.restPosition as Vector3;
    emotion.position.copy(rest);
    if (!reducedMotion) {
      emotion.position.y = rest.y + Math.sin(time * 1.1) * 0.045;
      emotion.rotation.y = Math.sin(time * 0.7) * 0.18;
    }
  }
  const moving = root.getObjectByName(FIND_HOOK_MOVING_LIGHT);
  if (moving?.userData.restPosition) {
    const rest = moving.userData.restPosition as Vector3;
    moving.position.copy(rest);
    if (!reducedMotion) moving.position.x = rest.x + Math.sin(time * 1.4) * 0.08;
    pulseEmissive(moving, reducedMotion ? 0.9 : 0.7 + Math.sin(time * 3.1) * 0.35);
  }
  const display = root.getObjectByName(FIND_HOOK_TIMESTAMP_DISPLAY) as Mesh | undefined;
  if (display?.isMesh) {
    drawTomorrow(display);
    pulseEmissive(display, reducedMotion ? 0.65 : 0.55 + Math.sin(time * 1.8) * 0.25);
  }
}

function Isolated({ children }: { children: ReactNode }) {
  return <ThreeSceneFallback fallback={null}>{children}</ThreeSceneFallback>;
}

function CargoCase({ rarity, reducedMotion }: { rarity: LootRarity; reducedMotion: boolean }) {
  const source = useGLTF(cargoCasePath(rarity));
  const lidName = cargoCaseLidName(rarity);
  const scene = useMemo(() => {
    const next = source.scene.clone(true);
    if (reducedMotion) {
      const lid = next.getObjectByName(lidName);
      if (lid) lid.rotation.x = LID_OPEN;
    }
    return next;
  }, [lidName, reducedMotion, source.scene]);
  useFrame((_, delta) => {
    if (reducedMotion) return;
    const lid = scene.getObjectByName(lidName);
    if (lid) lid.rotation.x = MathUtils.damp(lid.rotation.x, LID_OPEN, 1.7, delta);
  });
  return <primitive object={scene} scale={1.12} />;
}

function ArchiveStand() {
  const source = useGLTF(ARCHIVE_DISPLAY_PATH);
  const scene = useMemo(() => source.scene.clone(true), [source.scene]);
  return <primitive object={scene} />;
}

function RecoveredFind({ lootId, maxSize, reducedMotion, idle }: { lootId: LootId; maxSize: number; reducedMotion: boolean; idle: boolean }) {
  const path = findModelPath(lootId);
  if (!path) return null;
  return <LoadedFind path={path} maxSize={maxSize} reducedMotion={reducedMotion} idle={idle} />;
}

function LoadedFind({ path, maxSize, reducedMotion, idle }: { path: string; maxSize: number; reducedMotion: boolean; idle: boolean }) {
  const source = useGLTF(path);
  const object = useMemo(() => prepareFind(source.scene, maxSize), [maxSize, source.scene]);
  const holder = useRef<Group>(null);
  useFrame((state, delta) => {
    animateFindHooks(object, state.clock.elapsedTime, reducedMotion);
    if (!holder.current || reducedMotion || !idle) return;
    holder.current.rotation.y += delta * 0.22;
    holder.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.03;
  });
  return <group ref={holder}><primitive object={object} /></group>;
}

function FindOnMount({ lootId, reducedMotion }: { lootId: LootId; reducedMotion: boolean }) {
  return <group position={[0, 0.32, 0]}><RecoveredFind lootId={lootId} maxSize={0.52} reducedMotion={reducedMotion} idle /></group>;
}

export default function FindCanvas({ lootId, rarity, quality, reducedMotion, presentation = "cargo" }: { lootId: LootId; rarity: LootRarity; quality: ThreeQuality; reducedMotion: boolean; presentation?: FindPresentation }) {
  const cargo = presentation === "cargo";
  const accent = rarity === "cursed" ? "#d946ef" : rarity === "rare" ? "#a78bfa" : rarity === "uncommon" ? "#fbbf24" : "#67e8f9";
  return <Canvas dpr={quality === "high" ? [1, 1.5] : 1} frameloop={reducedMotion ? "demand" : "always"} camera={{ position: cargo ? [2.7, 2.9, 4.8] : [3.5, 2.5, 5.8], fov: 38 }} gl={{ antialias: quality === "high", powerPreference: "high-performance" }}>
    <SceneCamera target={cargo ? CARGO_TARGET : ARCHIVE_TARGET} />
    <ambientLight intensity={0.62} />
    <directionalLight position={[-4, -4, 6]} intensity={2.3} />
    <pointLight position={[2, 1, 3]} intensity={rarity === "cursed" ? 22 : 14} distance={9} color={accent} />
    {cargo ? <group rotation={[0.22, -0.4, 0]}>
      <Isolated><CargoCase rarity={rarity} reducedMotion={reducedMotion} /></Isolated>
      <Isolated><group position={CARGO_FIND_POSITION}><RecoveredFind lootId={lootId} maxSize={0.46} reducedMotion={reducedMotion} idle={false} /></group></Isolated>
    </group> : <>
      <Isolated><ArchiveStand /></Isolated>
      <Isolated><FindOnMount lootId={lootId} reducedMotion={reducedMotion} /></Isolated>
    </>}
  </Canvas>;
}
