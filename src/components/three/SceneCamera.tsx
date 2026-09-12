"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";

export function SceneCamera({ target = [0, 0, 0] }: { target?: [number, number, number] }) {
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, target]);
  return null;
}
