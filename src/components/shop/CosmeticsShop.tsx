"use client";

import { useMemo, useState } from "react";
import { SKINS, getSkin, rarityColor } from "@/lib/cosmetics";
import {
  canBuySkin,
  equipSkin,
  purchaseSkin,
  type PlayerWallet,
} from "@/lib/economy";
import { getActiveSkyEvents } from "@/lib/sky-events";
import { useAuth } from "@/components/auth/AuthProvider";

interface Props {
  wallet: PlayerWallet;
  onWalletChange: (w: PlayerWallet) => void;
}

export function CosmeticsShop({ wallet, onWalletChange }: Props) {
  const { persistWallet } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const activeEventIds = useMemo(
    () => getActiveSkyEvents().map((e) => e.id),
    []
  );

  async function buy(id: string) {
    const res = purchaseSkin(id, activeEventIds);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    await persistWallet(res.wallet);
    onWalletChange(res.wallet);
    setMsg(`Unlocked ${getSkin(id).name}!`);
  }

  async function equip(id: string) {
    const w = equipSkin(id);
    await persistWallet(w);
    onWalletChange(w);
    setMsg(`Equipped ${getSkin(id).name}`);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">Cosmetics bay</h3>
          <p className="text-sm text-slate-400">
            Spend credits on liveries. Equipped skin paints new launches &amp;
            map beacon.
          </p>
        </div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold tabular-nums text-amber-200">
          ✦ {wallet.credits} cr
        </div>
      </div>

      {msg && (
        <p className="mb-3 text-sm text-cyan-300" role="status">
          {msg}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SKINS.map((skin) => {
          const owned = wallet.unlockedSkinIds.includes(skin.id);
          const equipped = wallet.equippedSkinId === skin.id;
          const check = canBuySkin(wallet, skin, activeEventIds);
          const eventLocked =
            !!skin.eventId && !activeEventIds.includes(skin.eventId);

          return (
            <div
              key={skin.id}
              className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-lg border border-white/20 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${skin.color}, ${
                      skin.secondary || skin.color
                    }88)`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{skin.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wide ${rarityColor(
                        skin.rarity
                      )}`}
                    >
                      {skin.rarity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {skin.description}
                  </p>
                  {eventLocked && (
                    <p className="mt-1 text-[11px] text-amber-300/90">
                      Event-limited — wait for matching sky event
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-slate-400">
                  {skin.free ? "Free" : `${skin.priceCredits} cr`}
                </span>
                {owned ? (
                  <button
                    type="button"
                    disabled={equipped}
                    onClick={() => void equip(skin.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      equipped
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/10 text-slate-200 hover:bg-white/15"
                    }`}
                  >
                    {equipped ? "Equipped" : "Equip"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!check.ok}
                    onClick={() => void buy(skin.id)}
                    className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
