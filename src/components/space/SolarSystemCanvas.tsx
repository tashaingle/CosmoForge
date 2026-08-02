"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { BodyId } from "@/lib/bodies";
import type { OrbitElements } from "@/lib/orbital";
import type { LiveCraftMarker } from "@/lib/types";
import { SolarSystemScene } from "./SolarSystemScene";

interface Props {
  simMs: number;
  craftOrbit?: OrbitElements | null;
  craftName?: string;
  craftSkinId?: string;
  focus: "system" | "craft" | BodyId;
  otherCrafts?: LiveCraftMarker[];
  className?: string;
}

export function SolarSystemCanvas({
  simMs,
  craftOrbit,
  craftName,
  craftSkinId,
  focus,
  otherCrafts,
  className,
}: Props) {
  // Camera starts looking across Mars–asteroid belt–Jupiter (not tucked at Earth)
  return (
    <div className={className ?? "h-full w-full"}>
      <Canvas
        camera={{ position: [1.2, 3.5, 6.5], fov: 50, near: 0.01, far: 200 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: 4,
          toneMappingExposure: 1.1,
        }}
      >
        <Suspense fallback={null}>
          <SolarSystemScene
            simMs={simMs}
            craftOrbit={craftOrbit}
            craftName={craftName}
            craftSkinId={craftSkinId}
            focus={focus}
            otherCrafts={otherCrafts}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
