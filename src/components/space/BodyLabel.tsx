"use client";

/**
 * World-space HTML labels are disabled.
 * Drei Html + distanceFactor scales into giant floating text in space.
 * Names live in the mission HUD / camera panel only.
 */

export function BodyLabel(_props: {
  name: string;
  radius: number;
  variant?: "planet" | "moon" | "sun" | "craft";
}) {
  return null;
}
