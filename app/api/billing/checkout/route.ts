import { NextResponse } from "next/server";
import { getStripe, resolvePriceId, listConfiguredPlans } from "@/lib/stripe";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * Minimal Stripe Checkout (subscription mode).
 *
 * POST { plan: "starter" | "pro" | "business" }  ->  { url }
 *
 * The caller must be authenticated. We map the plan key to a Stripe Price ID
 * (configured via STRIPE_PRICE_<PLAN> env vars) and return a hosted Checkout URL
 * for the client to redirect to.
 *
 * NOTE: This only STARTS the subscription. To actually grant access after
 * payment you still need the Stripe webhook (checkout.session.completed /
 * customer.subscription.updated) wired to subscription-access — that is the
 * next billing milestone.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) return auth.response;

        const stripe = getStripe();
        if (!stripe) {
            return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
        }

        const body = await req.json().catch(() => ({}));
        const plan = typeof body?.plan === "string" ? body.plan.trim().toLowerCase() : "";
        const priceId = resolvePriceId(plan);
        if (!priceId) {
            return NextResponse.json(
                { error: "Unknown or unconfigured plan", availablePlans: listConfiguredPlans() },
                { status: 400 }
            );
        }

        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: auth.email || undefined,
            client_reference_id: auth.callerUid,
            metadata: { uid: auth.callerUid, plan },
            subscription_data: { metadata: { uid: auth.callerUid, plan } },
            allow_promotion_codes: true,
            success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/billing/cancel`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[Billing] Checkout error:", error);
        return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
    }
}
