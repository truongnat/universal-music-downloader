import { NextRequest, NextResponse } from "next/server";
import { getSoundCloudClientId } from "@/lib/soundcloud-client-id";
import { checkRateLimit, getClientIdentifier, rateLimitedResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limit client-id scraping: it fetches and parses SoundCloud HTML (expensive)
  const rl = checkRateLimit(`sc-client-id:${getClientIdentifier(req)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  try {
    const clientId = await getSoundCloudClientId();

    if (!clientId) {
      return NextResponse.json(
        { error: "Could not find client_id" },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientId });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching data from SoundCloud" },
      { status: 500 }
    );
  }
}
