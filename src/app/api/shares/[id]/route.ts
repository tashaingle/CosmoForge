import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Craft } from "@/lib/types";

export const runtime = "nodejs";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = getClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("mission_shares")
    .select("craft_snapshot, craft_name, mission_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.craft_snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    craft: data.craft_snapshot as Craft,
    createdAt: data.created_at,
  });
}
