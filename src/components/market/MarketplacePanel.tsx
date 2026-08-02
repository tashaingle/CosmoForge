"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  MARKETPLACE_TAKE_RATE,
  formatTakeRate,
  splitSale,
  type MarketListing,
} from "@/lib/marketplace";
import {
  cancelListing,
  createListing,
  fetchActiveListings,
  fetchMyListings,
  purchaseListing,
} from "@/lib/marketplace-api";
import { SKINS, getSkin } from "@/lib/cosmetics";
import { loadFleet, createCraft, upsertCraft } from "@/lib/storage";
import { loadWallet, replaceWallet } from "@/lib/economy";
import { fetchCloudWallet } from "@/lib/cloud-fleet";
import { InlineSpinner } from "@/components/ui/LoadingScreen";

export function MarketplacePanel() {
  const {
    user,
    displayName,
    configured,
    wallet,
    persistWallet,
    refreshWallet,
    syncContext,
  } = useAuth();
  const [tab, setTab] = useState<"browse" | "sell" | "mine">("browse");
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [mine, setMine] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // sell form
  const [sellType, setSellType] = useState<"skin" | "blueprint">("skin");
  const [sellItemId, setSellItemId] = useState("");
  const [sellPrice, setSellPrice] = useState(100);
  const [sellTitle, setSellTitle] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const active = await fetchActiveListings();
      setListings(active);
      if (user) {
        setMine(await fetchMyListings(user.id));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Market load failed");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ownedSkins = SKINS.filter(
    (s) => !s.free && wallet.unlockedSkinIds.includes(s.id)
  );
  const designCrafts = loadFleet().crafts.filter((c) => c.status === "design");

  const previewSplit = splitSale(sellPrice || 0);

  async function syncWalletFromCloud() {
    if (!user) {
      refreshWallet();
      return;
    }
    const cloud = await fetchCloudWallet(user.id);
    if (cloud?.credits != null) {
      const local = loadWallet();
      const next = {
        ...local,
        credits: cloud.credits,
        unlockedSkinIds: cloud.unlockedSkinIds ?? local.unlockedSkinIds,
        updatedAt: Date.now(),
      };
      replaceWallet(next);
      await persistWallet(next);
    } else {
      refreshWallet();
    }
  }

  async function onBuy(listing: MarketListing) {
    setMsg(null);
    setErr(null);
    if (!user) {
      setErr("Sign in to buy on the marketplace.");
      return;
    }
    const res = await purchaseListing(listing.id);
    if (!res.ok) {
      setErr(res.error || "Purchase failed");
      return;
    }
    // Blueprint also lands in cloud crafts — pull local wallet
    await syncWalletFromCloud();
    if (listing.itemType === "blueprint" && listing.payload?.partIds) {
      const craft = createCraft(
        String(listing.payload.name || listing.title),
        String(listing.payload.skinId || "default")
      );
      craft.partIds = listing.payload.partIds as string[];
      craft.notes = "Purchased marketplace blueprint";
      upsertCraft(craft, syncContext);
    }
    if (listing.itemType === "skin") {
      const w = loadWallet();
      if (!w.unlockedSkinIds.includes(listing.itemId)) {
        w.unlockedSkinIds.push(listing.itemId);
        await persistWallet(w);
      }
    }
    setMsg(
      `Purchased for ✦ ${res.priceCredits}. Platform fee ✦ ${res.platformFee} (${formatTakeRate()}); seller received ✦ ${res.sellerNet}.`
    );
    await refresh();
  }

  async function onList() {
    setMsg(null);
    setErr(null);
    if (!user) {
      setErr("Sign in to list items.");
      return;
    }
    if (!sellItemId) {
      setErr("Pick something to sell.");
      return;
    }
    let payload: Record<string, unknown> | undefined;
    let title = sellTitle;
    let itemId = sellItemId;

    if (sellType === "skin") {
      const skin = getSkin(sellItemId);
      title = title || `${skin.name} livery`;
      itemId = skin.id;
    } else {
      const craft = designCrafts.find((c) => c.id === sellItemId);
      if (!craft) {
        setErr("Craft not found");
        return;
      }
      title = title || `${craft.name} blueprint`;
      itemId = craft.id;
      payload = {
        name: craft.name,
        partIds: craft.partIds,
        skinId: craft.skinId || "default",
      };
    }

    const res = await createListing({
      sellerId: user.id,
      sellerName: displayName,
      itemType: sellType,
      itemId,
      title,
      description:
        sellType === "skin"
          ? `Cosmetic transfer · seller keeps their copy in Alpha`
          : `Design blueprint · buyer gets a new craft in hangar`,
      priceCredits: sellPrice,
      payload,
    });
    if (!res.ok) {
      setErr(res.error || "List failed");
      return;
    }
    setMsg(`Listed “${title}” for ✦ ${sellPrice}.`);
    setSellTitle("");
    setTab("mine");
    await refresh();
  }

  async function onCancel(id: string) {
    if (!user) return;
    const res = await cancelListing(id, user.id);
    if (!res.ok) setErr(res.error || "Cancel failed");
    else setMsg("Listing cancelled.");
    await refresh();
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-400">
        Marketplace needs Supabase. Configure cloud to enable player trading.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Marketplace</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Player-to-player listings for skins and ship blueprints. CosmoForge
            takes a{" "}
            <span className="font-semibold text-amber-200">
              {formatTakeRate()} platform fee
            </span>{" "}
            ({Math.round((1 - MARKETPLACE_TAKE_RATE) * 100)}% to seller).
          </p>
        </div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold tabular-nums text-amber-200">
          ✦ {wallet.credits}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["browse", "Browse"],
            ["sell", "Sell"],
            ["mine", "My listings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === id
                ? "bg-cyan-500/25 text-cyan-100"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      {(msg || err) && (
        <p
          className={`mt-3 text-sm ${err ? "text-rose-300" : "text-emerald-300"}`}
          role="status"
        >
          {err || msg}
        </p>
      )}

      {loading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <InlineSpinner /> Loading market…
        </p>
      )}

      {tab === "browse" && !loading && (
        <ul className="mt-4 space-y-2">
          {listings.length === 0 ? (
            <li className="text-sm text-slate-500">
              No active listings yet — be the first seller.
            </li>
          ) : (
            listings.map((l) => {
              const split = splitSale(l.priceCredits);
              return (
                <li
                  key={l.id}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{l.title}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                        {l.itemType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      by {l.sellerName} · you pay ✦ {l.priceCredits} · seller
                      nets ✦ {split.sellerNet} · platform ✦ {split.platformFee}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!user || user.id === l.sellerId}
                    onClick={() => void onBuy(l)}
                    className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    Buy
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {tab === "sell" && (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          {!user ? (
            <p className="text-sm text-amber-200">Sign in to list items.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSellType("skin");
                    setSellItemId("");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    sellType === "skin"
                      ? "bg-violet-500/30 text-violet-100"
                      : "bg-white/5"
                  }`}
                >
                  Skin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSellType("blueprint");
                    setSellItemId("");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    sellType === "blueprint"
                      ? "bg-violet-500/30 text-violet-100"
                      : "bg-white/5"
                  }`}
                >
                  Blueprint
                </button>
              </div>

              <label className="block text-xs uppercase tracking-wider text-slate-500">
                Item
                <select
                  value={sellItemId}
                  onChange={(e) => setSellItemId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="">Select…</option>
                  {sellType === "skin" &&
                    ownedSkins.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  {sellType === "blueprint" &&
                    designCrafts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.partIds.length} parts)
                      </option>
                    ))}
                </select>
              </label>

              {sellType === "skin" && ownedSkins.length === 0 && (
                <p className="text-xs text-slate-500">
                  Unlock a non-free skin in Cosmetics first.
                </p>
              )}
              {sellType === "blueprint" && designCrafts.length === 0 && (
                <p className="text-xs text-slate-500">
                  Create a craft in design status to sell its blueprint.
                </p>
              )}

              <label className="block text-xs uppercase tracking-wider text-slate-500">
                Title (optional)
                <input
                  value={sellTitle}
                  onChange={(e) => setSellTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                  placeholder="Listing title"
                />
              </label>

              <label className="block text-xs uppercase tracking-wider text-slate-500">
                Price (credits)
                <input
                  type="number"
                  min={10}
                  max={100000}
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                />
              </label>

              <p className="text-xs text-slate-400">
                At ✦ {sellPrice}: seller receives{" "}
                <span className="text-emerald-300">✦ {previewSplit.sellerNet}</span>
                , platform{" "}
                <span className="text-amber-200">
                  ✦ {previewSplit.platformFee}
                </span>{" "}
                ({formatTakeRate()} take-rate).
              </p>

              <button
                type="button"
                onClick={() => void onList()}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                List for sale
              </button>
            </>
          )}
        </div>
      )}

      {tab === "mine" && (
        <ul className="mt-4 space-y-2">
          {!user ? (
            <li className="text-sm text-slate-500">Sign in to see your listings.</li>
          ) : mine.length === 0 ? (
            <li className="text-sm text-slate-500">No listings yet.</li>
          ) : (
            mine.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3"
              >
                <div>
                  <p className="font-medium text-white">{l.title}</p>
                  <p className="text-xs text-slate-500">
                    ✦ {l.priceCredits} · {l.status}
                  </p>
                </div>
                {l.status === "active" && (
                  <button
                    type="button"
                    onClick={() => void onCancel(l.id)}
                    className="text-sm text-rose-300 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
