"use client"

import { Suspense } from "react"
import ChatbotContainer from "./ChatbotContainer"
import { WidgetLoader } from "./components/WidgetLoader"

export default function ChatbotView() {
    return (
        <Suspense fallback={<WidgetLoader loaderStyle="skeleton" ambientBottomMargin={0} showAmbientIcon={false} />}>
            <ChatbotContainer />
        </Suspense>
    )
}
