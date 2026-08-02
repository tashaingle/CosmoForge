"use client";

/**
 * Distant, unobtrusive name tags — hide when the camera is close
 * so textured globes stay readable.
 */

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export function BodyLabel({
  name,
  /** Body radius in scene units — used for offset + hide distance */
  radius,
  variant = "planet",
}: {
  name: string;
  radius: number;
  variant?: "planet" | "moon" | "sun" | "craft";
}) {
  const group = useRef<THREE.Group>(null);
  const world = useRef(new THREE.Vector3());
  const { camera } = useThree();
  const [show, setShow] = useState(true);

  useFrame(() => {
    if (!group.current) return;
    group.current.getWorldPosition(world.current);
    const dist = camera.position.distanceTo(world.current);
    // Hide once you're inspecting the globe (labels only for overview)
    const hideBelow = Math.max(0.22, radius * 8);
    const hideAbove = variant === "moon" ? 25 : 55;
    const next = dist > hideBelow && dist < hideAbove;
    setShow((prev) => (prev === next ? prev : next));
  });

  if (!show) return null;

  const yLift = Math.max(radius * 2.4, 0.02);
  const styles =
    variant === "sun"
      ? "border-amber-400/20 text-amber-100/80"
      : variant === "moon"
        ? "border-white/10 text-slate-300/80"
        : variant === "craft"
          ? "border-cyan-400/25 text-cyan-100/90"
          : "border-white/10 text-slate-200/85";

  return (
    <group ref={group} position={[0, yLift, 0]}>
      <Html
        center
        distanceFactor={variant === "craft" ? 8 : 14}
        style={{ pointerEvents: "none" }}
        zIndexRange={[10, 0]}
      >
        <div
          className={`select-none whitespace-nowrap rounded-md border bg-slate-950/50 px-1.5 py-0.5 text-[9px] font-medium tracking-wide shadow-none backdrop-blur-[2px] sm:text-[10px] ${styles}`}
        >
          {name}
        </div>
      </Html>
    </group>
  );
}
