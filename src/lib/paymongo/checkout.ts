import {
  getPaymongoSecretKey,
  paymongoApiUrl,
  paymongoAuthHeader,
} from "@/lib/paymongo/client";
import type {
  CreateCheckoutSessionParams,
  CreateCheckoutSessionResult,
  PayMongoCheckoutSessionResponse,
} from "@/lib/paymongo/types";

const DEFAULT_PAYMENT_METHOD_TYPES = [
  "card",
  "gcash",
  "grab_pay",
  "paymaya",
] as const;

/**
 * Create a PayMongo Hosted Checkout Session.
 * Amount must already be loaded from the database (never trust the client).
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CreateCheckoutSessionResult> {
  const secretKey = getPaymongoSecretKey();

  if (!Number.isFinite(params.amountCents) || params.amountCents < 0) {
    throw new Error("Invalid checkout amount");
  }

  const response = await fetch(paymongoApiUrl("/checkout_sessions"), {
    method: "POST",
    headers: {
      Authorization: paymongoAuthHeader(secretKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              currency: "PHP",
              amount: params.amountCents,
              name: params.description,
              quantity: 1,
            },
          ],
          payment_method_types: [...DEFAULT_PAYMENT_METHOD_TYPES],
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          description: params.description,
          metadata: params.metadata ?? {},
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `PayMongo checkout failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as PayMongoCheckoutSessionResponse;
  const checkoutId = data.data?.id;
  const checkoutUrl = data.data?.attributes?.checkout_url;

  if (!checkoutId || !checkoutUrl) {
    throw new Error("PayMongo checkout response missing id or checkout_url");
  }

  return { checkoutId, checkoutUrl };
}
