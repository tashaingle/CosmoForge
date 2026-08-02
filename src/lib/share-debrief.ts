/**
 * Shareable debrief cards — URL token, no server required.
 */

import type { VoyageDebrief } from "./types";

export interface DebriefSharePayload {
  v: 1;
  debrief: VoyageDebrief;
  sharedAt: number;
}

export function encodeDebriefShare(debrief: VoyageDebrief): string {
  const payload: DebriefSharePayload = {
    v: 1,
    debrief,
    sharedAt: Date.now(),
  };
  const json = JSON.stringify(payload);
  const b64 =
    typeof window !== "undefined"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDebriefShare(token: string): DebriefSharePayload | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json =
      typeof window !== "undefined"
        ? decodeURIComponent(escape(atob(b64 + pad)))
        : Buffer.from(b64 + pad, "base64").toString("utf8");
    const payload = JSON.parse(json) as DebriefSharePayload;
    if (payload?.v !== 1 || !payload.debrief?.craftName) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function shareDebriefCard(
  debrief: VoyageDebrief
): Promise<{ url: string; copied: boolean; text: string }> {
  const token = encodeDebriefShare(debrief);
  const url = `${window.location.origin}/d/${token}`;
  const text = formatDebriefShareText(debrief, url);

  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      /* ignore */
    }
  }

  // Native share sheet when available (mobile)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `${debrief.craftName} is home — CosmoForge`,
        text: text,
        url,
      });
    } catch {
      /* user cancelled */
    }
  }

  return { url, copied, text };
}

export function formatDebriefShareText(
  debrief: VoyageDebrief,
  url?: string
): string {
  const lines = [
    `${debrief.craftName} is home.`,
    `“${debrief.opener}”`,
    debrief.missionName,
    ...debrief.highlights.slice(0, 2),
  ];
  if (url) lines.push(url);
  lines.push("— CosmoForge · little ships with big personalities");
  return lines.join("\n");
}
