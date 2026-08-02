/**
 * Share a craft mission snapshot (short link when API available, else long URL).
 */

import { encodeShare } from "./storage";
import type { Craft } from "./types";

export async function shareCraftMission(
  craft: Craft,
  simMs?: number
): Promise<{ url: string; copied: boolean }> {
  const snapshot: Craft = {
    ...craft,
    lastSimMs: simMs ?? craft.lastSimMs ?? craft.launchedAt ?? Date.now(),
  };

  try {
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ craft: snapshot }),
    });
    if (res.ok) {
      const body = (await res.json()) as { path: string };
      const url = `${window.location.origin}${body.path}`;
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        /* ignore */
      }
      return { url, copied };
    }
  } catch {
    /* fall through */
  }

  const token = encodeShare(snapshot);
  const url = `${window.location.origin}/share/${token}`;
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    /* ignore */
  }
  return { url, copied };
}
