"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { PlanetId } from "@/lib/constants";
import type { OrbitElements } from "@/lib/orbital";
import type { LiveCraftMarker } from "@/lib/types";
import { SolarSystemScene } from "./SolarSystemScene";

interface Props {
  simMs: number;
  craftOrbit?: OrbitElements | null;
  craftName?: string;
  focus: "system" | "craft" | PlanetId;
  otherCrafts?: LiveCraftMarker[];
  className?: string;
}

export function SolarSystemCanvas({
  simMs,
  craftOrbit,
  craftName,
  focus,
  otherCrafts,
  className,
}: Props) {
  return (
    <div className={className ?? "h-full w-full"}>
      <Canvas
        camera={{ position: [0, 2.2, 4.5], fov: 50, near: 0.01, far: 200 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <SolarSystemScene
            simMs={simMs}
            craftOrbit={craftOrbit}
            craftName={craftName}
            focus={focus}
            otherCrafts={otherCrafts}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
