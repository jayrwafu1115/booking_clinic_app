import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ status: "ok", endpoint: "paymongo-webhook" });
}

type PayMongoSignatureParts = {
  timestamp: string;
  testSignature: string | null;
  liveSignature: string | null;
};

function parsePayMongoSignature(header: string): PayMongoSignatureParts | null {
  // Format: t={timestamp},te={hmac_test},li={hmac_live}
  const parts: Record<string, string> = {};

  for (const segment of header.split(",")) {
    const eq = segment.indexOf("=");
    if (eq === -1) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1).trim();
  }

  if (!parts["t"]) return null;

  return {
    timestamp: parts["t"],
    testSignature: parts["te"] ?? null,
    liveSignature: parts["li"] ?? null
  };
}

function verifyPayMongoSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const parsed = parsePayMongoSignature(signatureHeader);
  if (!parsed) return false;

  const payload = `${parsed.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const candidate = parsed.liveSignature || parsed.testSignature;
  if (!candidate) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
}

type PayMongoEvent = {
  data: {
    id: string;
    type: string;
    attributes: {
      type: string;
      data: {
        attributes: {
          metadata?: Record<string, unknown>;
          status?: string;
          billing_cycle_end?: string | null;
        };
      };
    };
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[paymongo/webhook] PAYMONGO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  const signatureHeader = request.headers.get("paymongo-signature");

  if (!verifyPayMongoSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: PayMongoEvent;
  try {
    event = JSON.parse(rawBody) as PayMongoEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const eventType = event?.data?.attributes?.type;
  const eventData = event?.data?.attributes?.data?.attributes;
  const metadata = eventData?.metadata ?? {};

  console.info(`[paymongo/webhook] Received event: ${eventType}`);

  try {
    if (
      eventType === "payment.paid" ||
      eventType === "link.payment.paid" ||
      eventType === "checkout_session.payment.paid"
    ) {
      const clinicId = typeof metadata["clinic_id"] === "string" ? metadata["clinic_id"] : null;

      if (clinicId) {
        const supabase = createSupabaseAdminClient();
        const planId = typeof metadata["plan_id"] === "string" ? metadata["plan_id"] : undefined;
        const now = new Date();
        const periodEnd = eventData?.billing_cycle_end
          ? eventData.billing_cycle_end
          : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

        const { error } = await supabase
          .from("clinic_subscriptions")
          .update({
            status: "active",
            ...(planId ? { plan_id: planId } : {}),
            current_period_start: now.toISOString(),
            current_period_end: periodEnd,
            trial_ends_at: null,
            updated_at: now.toISOString()
          })
          .eq("clinic_id", clinicId);

        if (error) {
          console.error(`[paymongo/webhook] Failed to update subscription for clinic ${clinicId}:`, error.message);
        } else {
          console.info(`[paymongo/webhook] Activated subscription for clinic ${clinicId}`);

          await supabase.from("audit_logs").insert({
            clinic_id: clinicId,
            actor_id: null,
            action: "billing.payment_received",
            entity_type: "clinic_subscription",
            entity_id: null,
            metadata: {
              event_type: eventType,
              paymongo_event_id: event.data.id,
              billing_cycle_end: eventData?.billing_cycle_end ?? null
            }
          });
        }
      }
    } else if (
      eventType === "payment.failed" ||
      eventType === "checkout_session.payment.expired"
    ) {
      const clinicId = typeof metadata["clinic_id"] === "string" ? metadata["clinic_id"] : null;

      if (clinicId) {
        const supabase = createSupabaseAdminClient();
        const { error } = await supabase
          .from("clinic_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("clinic_id", clinicId)
          .eq("status", "active");

        if (error) {
          console.error(`[paymongo/webhook] Failed to mark past_due for clinic ${clinicId}:`, error.message);
        } else {
          console.info(`[paymongo/webhook] Marked subscription past_due for clinic ${clinicId}`);

          await supabase.from("audit_logs").insert({
            clinic_id: clinicId,
            actor_id: null,
            action: "billing.payment_failed",
            entity_type: "clinic_subscription",
            entity_id: null,
            metadata: {
              event_type: eventType,
              paymongo_event_id: event.data.id
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("[paymongo/webhook] Handler error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
