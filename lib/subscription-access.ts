import { normalizePlanId } from "@/lib/pricing-config";

export type VionSubscriptionStatus =
    | "trial"
    | "active"
    | "cancelled"
    | "canceled"
    | "expired"
    | "past_due"
    | "unpaid"
    | null;

const PAID_PLAN_IDS = ["growth", "enterprise"] as const;
const DEFAULT_TRIAL_DAYS = 14;
const TRIAL_ALLOWED_PATHS = [
    "/console/dashboard",
    "/console/settings/subscription",
    "/console/settings/account",
];

export function isPaidVionPlan(planId: string | null | undefined) {
    return PAID_PLAN_IDS.includes(normalizePlanId(planId) as (typeof PAID_PLAN_IDS)[number]);
}

export function resolveVionTrialState(input: {
    planId: string | null | undefined;
    subscriptionStatus: VionSubscriptionStatus;
    trialEndsAt: string | null | undefined;
    now?: Date;
}) {
    const isPaidPlan = isPaidVionPlan(input.planId);

    if (!input.planId || input.subscriptionStatus === null) {
        return { isPaidPlan, isTrialExpired: false, trialDaysLeft: 0 };
    }

    if (input.subscriptionStatus === "active" && isPaidPlan) {
        return { isPaidPlan, isTrialExpired: false, trialDaysLeft: 0 };
    }

    if (!input.trialEndsAt) {
        return {
            isPaidPlan,
            isTrialExpired: false,
            trialDaysLeft: input.subscriptionStatus === "trial" ? DEFAULT_TRIAL_DAYS : 0,
        };
    }

    const endDate = new Date(input.trialEndsAt);
    const endTime = endDate.getTime();

    if (!Number.isFinite(endTime)) {
        return { isPaidPlan, isTrialExpired: false, trialDaysLeft: 0 };
    }

    const now = input.now ?? new Date();
    const diffMs = endTime - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
        isPaidPlan,
        isTrialExpired: diffDays <= 0,
        trialDaysLeft: Math.max(0, diffDays),
    };
}

export function shouldShowTrialExpiredOverlay(input: {
    isTrialExpired: boolean;
    subscriptionStatus: VionSubscriptionStatus;
    pathname: string | null | undefined;
}) {
    if (!input.isTrialExpired || input.subscriptionStatus === "active") return false;

    const pathname = input.pathname || "";
    return !TRIAL_ALLOWED_PATHS.some((allowedPath) => pathname.startsWith(allowedPath));
}
