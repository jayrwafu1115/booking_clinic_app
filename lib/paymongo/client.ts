const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set.");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export type CheckoutLineItem = {
  name: string;
  amount: number;
  currency: "PHP";
  quantity: number;
};

export type CreateCheckoutSessionParams = {
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  description?: string;
};

export type CheckoutSession = {
  id: string;
  checkoutUrl: string;
};

export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
  const res = await fetch(`${PAYMONGO_BASE}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader()
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          payment_method_types: ["card", "gcash", "paymaya"],
          line_items: params.lineItems.map((item) => ({
            currency: item.currency,
            amount: item.amount,
            name: item.name,
            quantity: item.quantity
          })),
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          ...(params.description ? { description: params.description } : {}),
          metadata: params.metadata
        }
      }
    })
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { errors?: { detail?: string }[] };
    throw new Error(err?.errors?.[0]?.detail ?? `PayMongo error: ${res.status}`);
  }

  const json = (await res.json()) as { data: { id: string; attributes: { checkout_url: string } } };
  return {
    id: json.data.id,
    checkoutUrl: json.data.attributes.checkout_url
  };
}
