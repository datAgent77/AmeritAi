import Link from "next/link";

export const metadata = {
    title: "Checkout canceled",
};

export default function BillingCancelPage() {
    return (
        <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
            <h1 className="text-2xl font-semibold">Checkout canceled</h1>
            <p className="max-w-md text-sm text-muted-foreground">
                No charge was made. You can pick a plan again whenever you are ready.
            </p>
            <Link
                href="/"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
                Back to dashboard
            </Link>
        </main>
    );
}
