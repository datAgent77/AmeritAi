import { OmniAppShell } from "@/components/omni-app/omni-app-shell"

export default function OmniAppLayout({ children }: { children: React.ReactNode }) {
    return <OmniAppShell>{children}</OmniAppShell>
}
