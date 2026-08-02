/** Platform marketplace economics */

/** Platform take-rate on player-to-player sales (20–30% band; we use 25%). */
export const MARKETPLACE_TAKE_RATE = 0.25;

export type MarketItemType = "skin" | "blueprint";

export type MarketListingStatus = "active" | "sold" | "cancelled";

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  itemType: MarketItemType;
  itemId: string;
  title: string;
  description: string;
  priceCredits: number;
  /** Blueprint snapshot or skin meta */
  payload: Record<string, unknown> | null;
  status: MarketListingStatus;
  createdAt: number;
  soldAt?: number;
  buyerId?: string;
}

export interface MarketSaleReceipt {
  listingId: string;
  priceCredits: number;
  takeRate: number;
  platformFee: number;
  sellerNet: number;
}

export function splitSale(priceCredits: number): {
  platformFee: number;
  sellerNet: number;
  takeRate: number;
} {
  const takeRate = MARKETPLACE_TAKE_RATE;
  const platformFee = Math.max(1, Math.round(priceCredits * takeRate));
  const sellerNet = Math.max(0, priceCredits - platformFee);
  return { platformFee, sellerNet, takeRate };
}

export function formatTakeRate(): string {
  return `${Math.round(MARKETPLACE_TAKE_RATE * 100)}%`;
}
