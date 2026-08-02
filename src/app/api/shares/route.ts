import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import type { Craft } from "@/lib/types";

export const runtime = "nodejs";

function getAdminOrAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || (!service && !anon)) return null;
  return createClient(url, service || anon!);
}

/** POST { craft } → { id, url path } short share link when Supabase is configured */
export async function POST(request: Request) {
  const supabase = getAdminOrAnon();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured", code: "NO_SUPABASE" },
      { status: 503 }
    );
  }

  let body: { craft?: Craft };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const craft = body.craft;
  if (!craft?.id || !craft.orbit) {
    return NextResponse.json(
      { error: "craft with orbit required" },
      { status: 400 }
    );
  }

  const id = nanoid(10);
  const { error } = await supabase.from("mission_shares").insert({
    id,
    craft_snapshot: craft,
    craft_name: craft.name,
    mission_id: craft.missionId ?? null,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id, path: `/s/${id}` });
}
