import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planForPriceId, mapStripeStatus } from "@/lib/stripe";
import { applySubscriptionToUser } from "@/lib/stripe-sync";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook -> subscription access sync.
 *
 * Configure in Stripe Dashboard (or `stripe listen`) to send:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 * pointing at  POST /api/billing/webhook  with STRIPE_WEBHOOK_SECRET set.
 *
 * Authentication is the Stripe signature (no bearer token); the raw request
 * body is required for signature verification, so we read req.text() directly.
 */
export async function POST(req: Request) {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !webhookSecret) {
        return NextResponse.json({ error: "Billing webhook not configured" }, { status: 503 });
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        console.error("[Billing] Webhook signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const uid = session.client_reference_id || session.metadata?.uid || null;
                const plan = session.metadata?.plan ?? null;
                if (uid) {
                    await applySubscriptionToUser({
                        uid,
                        planId: plan,
                        status: "active",
                        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
                        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
                    });
                }
                break;
            }

            case "customer.subscription.updated": {
                const sub = event.data.object as Stripe.Subscription;
                const uid = sub.metadata?.uid || null;
                const priceId = sub.items?.data?.[0]?.price?.id ?? null;
                const plan = sub.metadata?.plan ?? planForPriceId(priceId);
                const status = mapStripeStatus(sub.status);
                if (uid && status) {
                    await applySubscriptionToUser({
                        uid,
                        planId: plan,
                        status,
                        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : null,
                        stripeSubscriptionId: sub.id,
                    });
                }
                break;
            }

            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                const uid = sub.metadata?.uid || null;
                if (uid) {
                    // Subscription ended -> revoke paid access by downgrading to starter.
                    await applySubscriptionToUser({
                        uid,
                        planId: "starter",
                        status: "cancelled",
                        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : null,
                        stripeSubscriptionId: sub.id,
                    });
                }
                break;
            }

            default:
                // Ignore unhandled event types.
                break;
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("[Billing] Webhook handler error:", err);
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }
}
