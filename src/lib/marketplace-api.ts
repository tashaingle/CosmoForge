import { getSupabaseBrowser } from "./supabase";
import type { MarketListing, MarketItemType } from "./marketplace";
import { nanoid } from "nanoid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToListing(row: any): MarketListing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.seller_name || "Commander",
    itemType: row.item_type,
    itemId: row.item_id,
    title: row.title,
    description: row.description || "",
    priceCredits: row.price_credits,
    payload: row.payload,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    soldAt: row.sold_at ? new Date(row.sold_at).getTime() : undefined,
    buyerId: row.buyer_id || undefined,
  };
}

export async function fetchActiveListings(): Promise<MarketListing[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data, error } = await sb
    .from("market_listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) {
    console.warn("[market] list", error.message);
    return [];
  }
  return (data ?? []).map(rowToListing);
}

export async function fetchMyListings(
  userId: string
): Promise<MarketListing[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data, error } = await sb
    .from("market_listings")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    console.warn("[market] mine", error.message);
    return [];
  }
  return (data ?? []).map(rowToListing);
}

export async function createListing(input: {
  sellerId: string;
  sellerName: string;
  itemType: MarketItemType;
  itemId: string;
  title: string;
  description: string;
  priceCredits: number;
  payload?: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const sb = getSupabaseBrowser();
  if (!sb) return { ok: false, error: "Cloud not configured" };
  if (input.priceCredits < 10) {
    return { ok: false, error: "Minimum price is 10 credits" };
  }
  if (input.priceCredits > 100_000) {
    return { ok: false, error: "Price too high" };
  }
  const id = nanoid(12);
  const { error } = await sb.from("market_listings").insert({
    id,
    seller_id: input.sellerId,
    seller_name: input.sellerName,
    item_type: input.itemType,
    item_id: input.itemId,
    title: input.title.slice(0, 80),
    description: input.description.slice(0, 280),
    price_credits: Math.round(input.priceCredits),
    payload: input.payload ?? null,
    status: "active",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}

export async function cancelListing(
  listingId: string,
  sellerId: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  if (!sb) return { ok: false, error: "Cloud not configured" };
  const { error } = await sb
    .from("market_listings")
    .update({ status: "cancelled" })
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .eq("status", "active");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Purchase via RPC (atomic take-rate split).
 * Returns updated buyer credits if success.
 */
export async function purchaseListing(listingId: string): Promise<{
  ok: boolean;
  error?: string;
  platformFee?: number;
  sellerNet?: number;
  priceCredits?: number;
}> {
  const sb = getSupabaseBrowser();
  if (!sb) return { ok: false, error: "Cloud not configured — sign in required" };

  const { data, error } = await sb.rpc("market_purchase", {
    p_listing_id: listingId,
  });

  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.ok === false) {
    return {
      ok: false,
      error: (row && row.error_message) || "Purchase failed",
    };
  }
  return {
    ok: true,
    platformFee: row.platform_fee,
    sellerNet: row.seller_net,
    priceCredits: row.price_credits,
  };
}
