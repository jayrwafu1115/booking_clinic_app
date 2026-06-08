import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { handleWidgetChat, WidgetChatError, widgetClinicSlugSchema } from "@/server/widget/chat";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function rateLimitHeaders(result: { remaining: number; resetAt: number }) {
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000))
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;
  const slug = widgetClinicSlugSchema.safeParse(clinicSlug);

  if (!slug.success) {
    return NextResponse.json({ error: "Invalid clinic widget." }, { status: 404 });
  }

  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`widget:${slug.data}:${clientIp}`, {
    limit: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many widget messages. Please wait a moment and try again." },
      {
        status: 429,
        headers: rateLimitHeaders(rateLimit)
      }
    );
  }

  try {
    const payload = await request.json();
    const response = await handleWidgetChat(slug.data, payload, {
      ip: clientIp,
      user_agent: request.headers.get("user-agent") ?? null
    });

    return NextResponse.json(response, {
      headers: rateLimitHeaders(rateLimit)
    });
  } catch (error) {
    if (error instanceof WidgetChatError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: rateLimitHeaders(rateLimit)
        }
      );
    }

    console.error("Widget chat error", error);
    return NextResponse.json(
      { error: "The booking assistant could not respond right now." },
      {
        status: 500,
        headers: rateLimitHeaders(rateLimit)
      }
    );
  }
}
