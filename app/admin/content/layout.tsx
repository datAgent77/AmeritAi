"use client"

import ContentManagement from "@/components/content-management"

export default function ContentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // The ContentManagement component now handles its own layout
    // This layout just wraps the content management page
    return (
        <div className="h-[calc(100vh-4rem)]">
            <ContentManagement />
        </div>
    )
}
