/**
 * Weird agency reputation titles from what your probes have done.
 */

import { loadCollection, LOOT_CATALOG, type LootId } from "./probe-loot";
import { loadMemorials, loadLastMessages } from "./probe-memorial";
import { loadFleet } from "./storage";

export interface AgencyTitle {
  id: string;
  title: string;
  blurb: string;
}

export function computeAgencyTitles(): {
  active: AgencyTitle;
  unlocked: AgencyTitle[];
} {
  const collection = loadCollection();
  const fleet = loadFleet();
  const memorials = loadMemorials();
  const lasts = loadLastMessages();

  const found = (id: LootId) => (collection.found[id] ?? 0) > 0;
  const strangeCount = LOOT_CATALOG.filter(
    (l) =>
      (l.rarity === "rare" || l.rarity === "cursed") && found(l.id)
  ).length;
  const totalFound = Object.values(collection.found).filter((n) => n > 0).length;
  const lost = fleet.crafts.filter((c) => c.status === "lost").length;
  const retired = memorials.length;
  const scars = fleet.crafts.reduce((n, c) => n + (c.scarIds?.length ?? 0), 0);
  const hard = fleet.crafts.reduce((n, c) => n + (c.hardTrips ?? 0), 0);

  const pool: (AgencyTitle & { ok: boolean })[] = [
    {
      id: "rookie",
      title: "Rookie dispatcher",
      blurb: "You have launched at least one weirdo. Congratulations.",
      ok: fleet.crafts.length > 0 || totalFound > 0,
    },
    {
      id: "photo",
      title: "Collector of pretty Earthrises",
      blurb: "Science optional. Framing mandatory.",
      ok: found("pretty_earthrise") || found("first_light"),
    },
    {
      id: "mercury_adjacent",
      title: "The one who keeps losing ships near excitement",
      blurb: "Not always Mercury. The vibe is Mercury.",
      ok: lost >= 1,
    },
    {
      id: "impossible",
      title: "Collector of impossible photos",
      blurb: "Your codex has a weird half. It’s winning.",
      ok: strangeCount >= 2,
    },
    {
      id: "void",
      title: "On speaking terms with nothing",
      blurb: "Friend-shaped voids. You know the ones.",
      ok: found("friend_shaped_void"),
    },
    {
      id: "venus",
      title: "Accidental Venus literary agent",
      blurb: "Your probes write essays. You enable them.",
      ok: found("venus_fanfic"),
    },
    {
      id: "scarred",
      title: "Keeper of limping legends",
      blurb: "You don’t scrap the damaged ones. Correct.",
      ok: scars >= 3,
    },
    {
      id: "hard",
      title: "Chronic over-sender",
      blurb: "Hard trips. Soft apologies.",
      ok: hard >= 4,
    },
    {
      id: "memorial",
      title: "Hall curator",
      blurb: "You retire ships with plaques. That’s love.",
      ok: retired >= 2,
    },
    {
      id: "last_words",
      title: "Archivist of last messages",
      blurb: "You kept the final packets. Of course you did.",
      ok: lasts.length >= 2,
    },
    {
      id: "codex",
      title: "Codex halfway cursed",
      blurb: "Normal science is fine. The other half is the point.",
      ok: totalFound >= 8,
    },
  ];

  const unlocked = pool.filter((t) => t.ok).map(({ ok: _o, ...t }) => t);
  const active =
    unlocked[unlocked.length - 1] ??
    ({
      id: "unranked",
      title: "Unranked mission control",
      blurb: "Launch something. Become a problem.",
    } satisfies AgencyTitle);

  return { active, unlocked };
}
