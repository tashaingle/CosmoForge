import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Browser / client Supabase client (anon key). Safe to call without config — returns null. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;

  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
  return browserClient;
}

export type DbCraftRow = {
  id: string;
  user_id: string | null;
  name: string;
  commander_name: string | null;
  part_ids: string[];
  status: "design" | "inflight" | "complete";
  mission_id: string | null;
  orbit: unknown;
  launched_at: string | null;
  last_sim_ms: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
