"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group, Material, Mesh } from "three";
import { Color } from "three";
import type { Craft } from "@/lib/types";
import { MODEL_PATHS, PROBE_ALTERNATE_MODULES, PROBE_DEFAULT_MODULES, SCAR_3D_OBJECTS } from "@/lib/3d-assets";
import { getSkin } from "@/lib/cosmetics";

type ProbeModelProps = {
  craft: Craft;
  reducedMotion?: boolean;
  launching?: boolean;
  reaction?: "anxious" | "dramatic" | "chaotic" | null;
};

function visibleTree(root: Group, name: string, visible: boolean) {
  const target = root.getObjectByName(name);
  if (target) target.traverse((child) => { child.visible = visible; });
}

function visibleFamily(root: Group, name: string, visible: boolean) {
  root.traverse((object) => {
    if (object.name === name || object.name.startsWith(`${name}_`)) object.visible = visible;
  });
}

export function ProbeModel({ craft, reducedMotion = false, launching = false, reaction = null }: ProbeModelProps) {
  const group = useRef<Group>(null);
  const probeSource = useGLTF(MODEL_PATHS.probe);
  const damageSource = useGLTF(MODEL_PATHS.damage);
  const personality = craft.personalityId ?? "chipper";
  const { probe, damage } = useMemo(() => {
    const probe = probeSource.scene.clone(true);
    const damage = damageSource.scene.clone(true);
    for (const name of PROBE_ALTERNATE_MODULES) visibleFamily(probe, name, false);
    for (const name of PROBE_DEFAULT_MODULES) visibleFamily(probe, name, true);
    damage.traverse((child) => { child.visible = false; });
    damage.visible = true;
    for (const scar of craft.scarIds ?? []) {
      for (const objectName of SCAR_3D_OBJECTS[scar] ?? []) visibleTree(damage, objectName, true);
    }
    const voyages = craft.voyagesCompleted ?? 0;
    if (voyages >= 4) visibleTree(damage, "Veteran_MissionSticker_01", true);
    if (voyages >= 8) visibleTree(damage, "Repair_PatchPlate_Small", true);
    if (voyages >= 12) visibleTree(damage, "Repair_WeldedSeam", true);
    if ((craft.scarIds ?? []).includes("afraid_of_dark")) visibleTree(probe, "Antenna_Whip", false);

    const skinColour = new Color(getSkin(craft.skinId).color);
    probe.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = materials.map((original) => {
        const next = original.clone() as Material & { color?: Color };
        if (original.name === "CF_Body" && next.color) next.color.lerp(skinColour, 0.7);
        return next;
      });
      if (mesh.material.length === 1) mesh.material = mesh.material[0];
    });
    return { probe, damage };
  }, [craft.scarIds, craft.skinId, craft.voyagesCompleted, damageSource.scene, probeSource.scene]);

  useFrame(({ clock }, delta) => {
    if (!group.current || reducedMotion) return;
    const t = clock.elapsedTime;
    const speed = personality === "dramatic" ? 0.42 : personality === "poet" || personality === "existential" ? 0.25 : 0.65;
    const amount = personality === "grumpy" ? 0.008 : personality === "anxious" ? 0.022 : 0.014;
    group.current.position.y = Math.sin(t * speed) * (launching ? 0.03 : 0.08);
    group.current.rotation.z = Math.sin(t * speed * 1.3) * amount;
    group.current.rotation.y += delta * (personality === "chaotic" ? 0.018 + Math.sin(t * 1.7) * 0.008 : 0.008);
    if (reaction === "anxious") group.current.position.z = Math.sin(t * 5) * 0.025;
    if (reaction === "dramatic") group.current.rotation.y += delta * 0.08;
    if (reaction === "chaotic") group.current.rotation.x = Math.sin(t * 3.2) * 0.025;
  });

  return <group ref={group} scale={0.82} rotation={[0.04, -0.22, 0]}>
    <primitive object={probe} />
    <primitive object={damage} />
    {(craft.cargoLootIds ?? []).includes("friend_shaped_void") && <mesh rotation={[Math.PI / 2, 0.2, 0]}><torusGeometry args={[1.7, 0.012, 5, 48]} /><meshBasicMaterial color="#d946ef" transparent opacity={0.3} /></mesh>}
  </group>;
}

useGLTF.preload(MODEL_PATHS.probe);
