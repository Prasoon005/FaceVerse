import { NextResponse } from "next/server";
import { z } from "zod";

import { recognitionConfig } from "@/config/recognition";
import { normalize, toPgVector } from "@/lib/ai/vector";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

const schema = z.object({
  embedding: z
    .array(z.number().refine(Number.isFinite))
    .length(recognitionConfig.face.embeddingSize),
});

export type ShareFindResponse =
  | {
      ok: true;
      matches: {
        photoId: string;
        similarity: number;
        box: { x: number; y: number; w: number; h: number };
      }[];
    }
  | { ok: false; message: string };

/**
 * "Find me" on a public shared album (no account needed). The guest's browser computes the
 * selfie's face descriptor; the server searches only inside that album, only if it's public.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/share/[code]/find">) {
  const { code } = await ctx.params;
  if (!isAdminConfigured() || !/^[0-9a-f]{6,32}$/.test(code)) {
    return NextResponse.json({ ok: false, message: "Not found." } satisfies ShareFindResponse, {
      status: 404,
    });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request." } satisfies ShareFindResponse,
      { status: 400 },
    );
  }
  const { data, error } = await createAdminClient().rpc("find_in_shared_album", {
    code,
    query: toPgVector(normalize(parsed.data.embedding)),
    match_threshold: recognitionConfig.albums.findThreshold,
  });
  if (error) {
    return NextResponse.json({ ok: false, message: "Search failed." } satisfies ShareFindResponse, {
      status: 500,
    });
  }
  const body: ShareFindResponse = {
    ok: true,
    matches: (data ?? [])
      .map((r) => ({
        photoId: r.photo_id,
        similarity: r.similarity,
        box: r.box as { x: number; y: number; w: number; h: number },
      }))
      .sort((a, b) => b.similarity - a.similarity),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
