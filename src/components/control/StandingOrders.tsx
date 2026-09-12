"use client";

import Link from "next/link";
import { DailyQuestCompact } from "@/components/home/DailyQuestCompact";
import { collectionStats } from "@/lib/probe-loot";
import { standingOrder, type StandingTone } from "@/lib/standing-orders";
import type { Craft } from "@/lib/types";
import { isReadyToReturn } from "@/lib/probe-voyage";
import { getEncounter } from "@/game/encounters";

function hasPendingChoice(craft: Craft | null) {
  return Boolean(craft?.pings?.some((ping) => ping.encounterId && !ping.resolvedChoiceId && (getEncounter(ping.encounterId)?.choices?.length ?? 0) > 0));
}

const TONE_CLASS: Record<StandingTone, string> = {
  choice: "standing-orders-choice",
  return: "standing-orders-return",
  wait: "",
  home: "",
  launch: "",
};

export function StandingOrders({ craft, now }: { craft: Craft | null; now: number }) {
  const pending = hasPendingChoice(craft);
  const order = standingOrder({
    craftName: craft?.name,
    status: craft?.status,
    pendingChoice: pending,
    readyToReturn: Boolean(craft && isReadyToReturn(craft, now)),
  });
  const stats = collectionStats();
  return (
    <section className={`standing-orders ${TONE_CLASS[order.tone]}`} aria-live="polite">
      <div>
        <p className="control-kicker">{order.kicker}</p>
        <h2>{order.title}</h2>
        <p>{order.blurb}</p>
        <p className="standing-orders-meta">
          Job: launch → answer → bring home → catalogue.
          {" · "}
          <Link href="/archive">Codex {stats.found}/{stats.total}</Link>
        </p>
      </div>
      <DailyQuestCompact />
    </section>
  );
}

export { hasPendingChoice };
