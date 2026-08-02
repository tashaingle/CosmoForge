"use client";

/**
 * Readable spacecraft — not a floating octahedron.
 * Scales with camera distance so it stays visible in system view
 * without becoming a giant near planets.
 */

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export function CraftModel({
  color = "#22d3ee",
  /** Base size in scene units at reference distance */
  baseSize = 0.012,
}: {
  color?: string;
  baseSize?: number;
}) {
  const root = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const world = useMemo(() => new THREE.Vector3(), []);
  const accent = useMemo(() => new THREE.Color(color), [color]);

  useFrame(() => {
    if (!root.current) return;
    root.current.getWorldPosition(world);
    const dist = camera.position.distanceTo(world);
    // Keep craft readable: grow when far, cap when close
    const s = THREE.MathUtils.clamp(dist * 0.035, 0.55, 4.5);
    root.current.scale.setScalar(s);
    // Gentle idle spin so it reads as a craft, not a billboard
    root.current.rotation.y += 0.004;
  });

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c5cdd6",
        metalness: 0.55,
        roughness: 0.35,
      }),
    []
  );
  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1e3a5f",
        metalness: 0.3,
        roughness: 0.45,
        emissive: "#0c4a6e",
        emissiveIntensity: 0.15,
      }),
    []
  );
  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c4a574",
        metalness: 0.7,
        roughness: 0.3,
      }),
    []
  );
  const engineMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1e293b",
        emissive: accent,
        emissiveIntensity: 0.85,
        metalness: 0.4,
        roughness: 0.4,
      }),
    [accent]
  );
  const dishMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        metalness: 0.6,
        roughness: 0.25,
      }),
    []
  );

  const u = baseSize;

  return (
    <group ref={root}>
      {/* Bus / main body */}
      <mesh material={bodyMat} position={[0, 0, 0]}>
        <boxGeometry args={[u * 1.1, u * 0.85, u * 1.6]} />
      </mesh>
      {/* Gold MLI wrap accent */}
      <mesh material={goldMat} position={[0, 0, u * 0.15]}>
        <boxGeometry args={[u * 1.15, u * 0.5, u * 0.9]} />
      </mesh>

      {/* Solar wings */}
      <mesh material={panelMat} position={[-u * 1.55, 0, 0]}>
        <boxGeometry args={[u * 1.8, u * 0.06, u * 1.0]} />
      </mesh>
      <mesh material={panelMat} position={[u * 1.55, 0, 0]}>
        <boxGeometry args={[u * 1.8, u * 0.06, u * 1.0]} />
      </mesh>
      {/* Panel struts */}
      <mesh material={bodyMat} position={[-u * 0.7, 0, 0]}>
        <boxGeometry args={[u * 0.35, u * 0.08, u * 0.12]} />
      </mesh>
      <mesh material={bodyMat} position={[u * 0.7, 0, 0]}>
        <boxGeometry args={[u * 0.35, u * 0.08, u * 0.12]} />
      </mesh>

      {/* HGA dish */}
      <mesh
        material={dishMat}
        position={[0, u * 0.55, -u * 0.2]}
        rotation={[Math.PI / 2.4, 0, 0]}
      >
        <cylinderGeometry args={[u * 0.45, u * 0.45, u * 0.06, 16]} />
      </mesh>
      <mesh material={bodyMat} position={[0, u * 0.35, -u * 0.15]}>
        <cylinderGeometry args={[u * 0.04, u * 0.04, u * 0.35, 6]} />
      </mesh>

      {/* Engine bell + glow */}
      <mesh
        material={engineMat}
        position={[0, 0, u * 1.05]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[u * 0.28, u * 0.45, 10]} />
      </mesh>
      <mesh position={[0, 0, u * 1.35]}>
        <sphereGeometry args={[u * 0.22, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Soft selection halo */}
      <mesh>
        <sphereGeometry args={[u * 2.8, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
