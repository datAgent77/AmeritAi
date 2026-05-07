import { CookieAppShell } from "@/components/cookie/cookie-app-shell"

export default function CookieLayout({ children }: { children: React.ReactNode }) {
    return <CookieAppShell>{children}</CookieAppShell>
}
