/**
 * Retirement hall + collectible last messages.
 */

import type { Craft, LastMessage, MemorialEntry } from "./types";
import { getPersonality } from "./probe-personality";
import { loadFleet, upsertCraft, type SyncContext } from "./storage";
import { bondLabel } from "./probe-relationship";

const MEMORIAL_KEY = "cosmoforge-memorials-v1";
const LAST_MSG_KEY = "cosmoforge-last-messages-v1";

export function loadMemorials(): MemorialEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMORIAL_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as MemorialEntry[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveMemorials(list: MemorialEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMORIAL_KEY, JSON.stringify(list.slice(0, 100)));
}

export function loadLastMessages(): LastMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LAST_MSG_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as LastMessage[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveLastMessages(list: LastMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_MSG_KEY, JSON.stringify(list.slice(0, 50)));
}

export function addLastMessage(msg: LastMessage): void {
  const list = loadLastMessages();
  if (list.some((m) => m.craftId === msg.craftId && m.text === msg.text)) return;
  list.unshift(msg);
  saveLastMessages(list);
}

const LAST_LINES = [
  "If this is the last packet: thanks for the view.",
  "Signal degrading. Tell the hangar I was fine. Mostly.",
  "I left the data where you can find it. I am less sure about me.",
  "Going quiet now. Not mad. Just… orbital.",
  "One more thing — Venus is still overrated. (Unless it isn’t.)",
  "Please don’t send the next one alone.",
  "I can see the Sun. It’s loud. I’m not.",
];

export function pickLastLine(seed: number): string {
  return LAST_LINES[Math.abs(seed) % LAST_LINES.length];
}

export function retireProbe(
  craftId: string,
  plaque: string | undefined,
  sync?: SyncContext
): { ok: boolean; entry?: MemorialEntry; error?: string } {
  const craft = loadFleet().crafts.find((c) => c.id === craftId);
  if (!craft) return { ok: false, error: "Probe not found" };
  if (craft.status === "inflight") {
    return { ok: false, error: "Call them home (or wait) before retiring." };
  }
  if (craft.status === "retired") {
    return { ok: false, error: "Already retired." };
  }

  const personality = getPersonality(craft.personalityId ?? "chipper");
  const defaultPlaque =
    plaque?.trim() ||
    `${craft.name} · ${personality.label} · ${bondLabel(craft.relationship)} · flew ${craft.voyagesCompleted ?? 0} voyages`;

  const entry: MemorialEntry = {
    craftId: craft.id,
    name: craft.name,
    personalityId: craft.personalityId,
    scarIds: craft.scarIds ?? [],
    plaque: defaultPlaque.slice(0, 160),
    retiredAt: Date.now(),
    voyagesCompleted: craft.voyagesCompleted ?? 0,
    lastMessage: craft.lastMessage,
    lineageNote: craft.lineageNote,
  };

  const memorials = loadMemorials();
  memorials.unshift(entry);
  saveMemorials(memorials);

  const next: Craft = {
    ...craft,
    status: "retired",
    retiredAt: entry.retiredAt,
    memorialPlaque: entry.plaque,
    updatedAt: Date.now(),
  };
  upsertCraft(next, sync);
  return { ok: true, entry };
}

export function formatMemorialLine(e: MemorialEntry): string {
  return `“${e.plaque}” — ${e.name}`;
}
