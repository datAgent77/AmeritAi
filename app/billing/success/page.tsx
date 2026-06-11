import Link from "next/link";

export const metadata = {
    title: "Subscription successful",
};

export default function BillingSuccessPage() {
    return (
        <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
            <h1 className="text-2xl font-semibold">Thank you! Your subscription is being activated.</h1>
            <p className="max-w-md text-sm text-muted-foreground">
                Your payment was received. It may take a moment for your account to update.
                If your plan does not change shortly, please refresh or contact support.
            </p>
            <Link
                href="/"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
                Go to dashboard
            </Link>
        </main>
    );
}
